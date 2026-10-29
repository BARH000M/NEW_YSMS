import { supabase } from './supabaseClient';

/**
 * Database health housekeeping — two small pieces of state that belong to the
 * health page itself rather than to school data:
 *
 *   1. SIGN-OFFS — "I looked at this check and fixed it" notes, one per check,
 *      so a second admin can see who cleared what and when.
 *   2. DIGEST — who receives the weekly findings email and when it goes out.
 *
 * Both live in the existing `settings` table (one JSON row each), which already
 * carries admin-only write policies and staff read policies. Nothing here can
 * touch student, fee or mark data.
 */

const REVIEW_KEY = 'health_reviews';
const REVIEW_LOG_KEY = 'health_review_log';
const DIGEST_KEY = 'health_digest';

/** Hard cap so the sign-off history can never grow without bound. */
const REVIEW_LOG_LIMIT = 600;

export interface HealthReviewRecord {
  checkKey: string;
  note: string | null;
  /** How many findings the check had when it was signed off. */
  findingCount: number | null;
  reviewedAt: string;
  reviewedByName: string | null;
}

export type HealthReviewMap = Record<string, HealthReviewRecord>;

/**
 * What happened to a check:
 *   signed_off — someone confirmed it was fixed
 *   cleared    — the sign-off was removed without a stated reason
 *   reopened   — a signed-off check was deliberately sent back to outstanding
 */
export type HealthReviewAction = 'signed_off' | 'cleared' | 'reopened';

/** One entry of the sign-off history — immutable once written. */
export interface HealthReviewEvent {
  id: string;
  checkKey: string;
  action: HealthReviewAction;
  note: string | null;
  findingCount: number | null;
  at: string;
  byName: string | null;
}

/** Latest sign-off per check plus every sign-off that came before it. */
export interface HealthReviewState {
  reviews: HealthReviewMap;
  log: HealthReviewEvent[];
}

export interface DigestSettings {
  enabled: boolean;
  /** 1 = Monday … 7 = Sunday. */
  weekday: number;
  hourUtc: number;
  recipients: string[];
  lastSentAt: string | null;
  lastStatus: string | null;
}

export const DEFAULT_DIGEST: DigestSettings = {
  enabled: false,
  weekday: 1,
  hourUtc: 7,
  recipients: [],
  lastSentAt: null,
  lastStatus: null,
};

interface SettingRow {
  id: string;
  institution_id: string | null;
  value: unknown;
}

/** Read one settings row by key; returns null when it has never been saved. */
async function readSettingRow(key: string): Promise<SettingRow | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('id, institution_id, value')
    .eq('key', key)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SettingRow | null) ?? null;
}

/** Update the existing row, otherwise insert one mirroring the tenant of the others. */
async function writeSettingRow(
  key: string,
  value: Record<string, unknown>,
  fallbackInstitutionId: string | null,
): Promise<void> {
  const existing = await readSettingRow(key);

  if (existing) {
    const { error } = await supabase
      .from('settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  let institutionId = fallbackInstitutionId;
  if (!institutionId) {
    const { data } = await supabase
      .from('settings')
      .select('institution_id')
      .limit(1)
      .maybeSingle();
    institutionId = (data as { institution_id: string | null } | null)?.institution_id ?? null;
  }

  const { error } = await supabase.from('settings').insert({ key, value, institution_id: institutionId });
  if (error) throw new Error(error.message);
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

// --------------------------------------------------------------- sign-offs

export async function fetchHealthReviews(): Promise<HealthReviewMap> {
  const row = await readSettingRow(REVIEW_KEY);
  const raw = asRecord(row?.value);
  const map: HealthReviewMap = {};

  Object.entries(raw).forEach(([checkKey, entry]) => {
    const record = asRecord(entry);
    const reviewedAt = typeof record.reviewedAt === 'string' ? record.reviewedAt : null;
    if (!reviewedAt) return;
    map[checkKey] = {
      checkKey,
      note: typeof record.note === 'string' && record.note.trim() ? record.note.trim() : null,
      findingCount: typeof record.findingCount === 'number' ? record.findingCount : null,
      reviewedAt,
      reviewedByName:
        typeof record.reviewedByName === 'string' && record.reviewedByName.trim()
          ? record.reviewedByName.trim()
          : null,
    };
  });

  return map;
}

/** One history entry, tolerating older/partial rows. */
function parseEvent(checkKey: string, entry: unknown, index: number): HealthReviewEvent | null {
  const record = asRecord(entry);
  const at = typeof record.at === 'string' ? record.at : null;
  if (!at) return null;
  return {
    id:
      typeof record.id === 'string' && record.id
        ? record.id
        : `${checkKey}-${index}-${at}`,
    checkKey,
    action:
      record.action === 'cleared'
        ? 'cleared'
        : record.action === 'reopened'
          ? 'reopened'
          : 'signed_off',
    note: typeof record.note === 'string' && record.note.trim() ? record.note.trim() : null,
    findingCount: typeof record.findingCount === 'number' ? record.findingCount : null,
    at,
    byName:
      typeof record.byName === 'string' && record.byName.trim() ? record.byName.trim() : null,
  };
}

/** Read the full sign-off history, newest first. */
async function readReviewLog(): Promise<HealthReviewEvent[]> {
  const row = await readSettingRow(REVIEW_LOG_KEY);
  const raw = row?.value;
  const rawRecord = asRecord(raw);
  const list = Array.isArray(raw) ? raw : Array.isArray(rawRecord.events) ? rawRecord.events : [];

  const events: HealthReviewEvent[] = [];
  list.forEach((entry, index) => {
    const record = asRecord(entry);
    const checkKey = typeof record.checkKey === 'string' ? record.checkKey : null;
    if (!checkKey) return;
    const parsed = parseEvent(checkKey, record, index);
    if (parsed) events.push(parsed);
  });

  return events.sort((a, b) => (a.at < b.at ? 1 : -1));
}

/**
 * Latest sign-off per check plus the full timeline. Sign-offs saved before the
 * history existed are turned into log entries on read, so nothing looks lost.
 */
export async function fetchHealthReviewState(): Promise<HealthReviewState> {
  const [reviews, logged] = await Promise.all([fetchHealthReviews(), readReviewLog()]);
  if (logged.length > 0) return { reviews, log: logged };

  const seeded: HealthReviewEvent[] = Object.values(reviews)
    .map((review, index) => ({
      id: `legacy-${review.checkKey}-${index}`,
      checkKey: review.checkKey,
      action: 'signed_off' as HealthReviewAction,
      note: review.note,
      findingCount: review.findingCount,
      at: review.reviewedAt,
      byName: review.reviewedByName,
    }))
    .sort((a, b) => (a.at < b.at ? 1 : -1));

  return { reviews, log: seeded };
}

export async function saveHealthReview(input: {
  checkKey: string;
  note: string;
  findingCount: number;
  reviewerName: string | null;
  institutionId: string | null;
}): Promise<HealthReviewState> {
  const { reviews, log } = await fetchHealthReviewState();
  const at = new Date().toISOString();

  const record: HealthReviewRecord = {
    checkKey: input.checkKey,
    note: input.note.trim() ? input.note.trim() : null,
    findingCount: input.findingCount,
    reviewedAt: at,
    reviewedByName: input.reviewerName,
  };

  const nextReviews: HealthReviewMap = { ...reviews, [input.checkKey]: record };
  const event: HealthReviewEvent = {
    id: `${input.checkKey}-${Date.now()}`,
    checkKey: input.checkKey,
    action: 'signed_off',
    note: record.note,
    findingCount: input.findingCount,
    at,
    byName: input.reviewerName,
  };
  const nextLog = [event, ...log].slice(0, REVIEW_LOG_LIMIT);

  await writeSettingRow(REVIEW_KEY, nextReviews, input.institutionId);
  await writeSettingRow(REVIEW_LOG_KEY, { events: nextLog }, input.institutionId);
  return { reviews: nextReviews, log: nextLog };
}

/**
 * Reopen a signed-off check: it goes back to outstanding, and the reason is
 * kept in the history so the next admin knows why it came back.
 */
export async function reopenHealthReview(input: {
  checkKey: string;
  reason: string;
  institutionId: string | null;
  reviewerName?: string | null;
}): Promise<HealthReviewState> {
  const { reviews, log } = await fetchHealthReviewState();
  const previous = reviews[input.checkKey];
  const nextReviews: HealthReviewMap = { ...reviews };
  delete nextReviews[input.checkKey];

  const at = new Date().toISOString();
  const reason = input.reason.trim();
  const event: HealthReviewEvent = {
    id: `${input.checkKey}-reopen-${Date.now()}`,
    checkKey: input.checkKey,
    action: 'reopened',
    note: reason || null,
    findingCount: previous?.findingCount ?? null,
    at,
    byName: input.reviewerName ?? null,
  };
  const nextLog = [event, ...log].slice(0, REVIEW_LOG_LIMIT);

  await writeSettingRow(REVIEW_KEY, nextReviews, input.institutionId);
  await writeSettingRow(REVIEW_LOG_KEY, { events: nextLog }, input.institutionId);
  return { reviews: nextReviews, log: nextLog };
}

/** Clearing a sign-off is itself recorded, so the history never loses a step. */
export async function clearHealthReview(input: {
  checkKey: string;
  institutionId: string | null;
  reviewerName?: string | null;
}): Promise<HealthReviewState> {
  const { reviews, log } = await fetchHealthReviewState();
  const previous = reviews[input.checkKey];
  const nextReviews: HealthReviewMap = { ...reviews };
  delete nextReviews[input.checkKey];

  const at = new Date().toISOString();
  const event: HealthReviewEvent = {
    id: `${input.checkKey}-${Date.now()}`,
    checkKey: input.checkKey,
    action: 'cleared',
    note: previous?.note ?? null,
    findingCount: previous?.findingCount ?? null,
    at,
    byName: input.reviewerName ?? null,
  };
  const nextLog = [event, ...log].slice(0, REVIEW_LOG_LIMIT);

  await writeSettingRow(REVIEW_KEY, nextReviews, input.institutionId);
  await writeSettingRow(REVIEW_LOG_KEY, { events: nextLog }, input.institutionId);
  return { reviews: nextReviews, log: nextLog };
}

// ----------------------------------------------------------------- digest

export async function fetchDigestSettings(): Promise<DigestSettings> {
  const row = await readSettingRow(DIGEST_KEY);
  const raw = asRecord(row?.value);
  const recipients = Array.isArray(raw.recipients)
    ? raw.recipients.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    enabled: raw.enabled === true,
    weekday: typeof raw.weekday === 'number' ? raw.weekday : DEFAULT_DIGEST.weekday,
    hourUtc: typeof raw.hourUtc === 'number' ? raw.hourUtc : DEFAULT_DIGEST.hourUtc,
    recipients,
    lastSentAt: typeof raw.lastSentAt === 'string' ? raw.lastSentAt : null,
    lastStatus: typeof raw.lastStatus === 'string' ? raw.lastStatus : null,
  };
}

export async function saveDigestSettings(
  settings: DigestSettings,
  institutionId: string | null,
): Promise<DigestSettings> {
  const value: Record<string, unknown> = {
    enabled: settings.enabled,
    weekday: settings.weekday,
    hourUtc: settings.hourUtc,
    recipients: settings.recipients,
    lastSentAt: settings.lastSentAt,
    lastStatus: settings.lastStatus,
  };
  await writeSettingRow(DIGEST_KEY, value, institutionId);
  return settings;
}

export interface DigestSendResult {
  sent: boolean;
  findings: number;
  recipients: string[];
  message: string;
}

/**
 * Ask the backend function to run the sweep and email the findings right now.
 * The cron schedule calls the same function; this is the "prove it works" path.
 *
 * Recipients typed into the card are passed along, so an admin can send a test
 * digest before saving the settings.
 */
export async function sendDigestNow(recipients?: string[]): Promise<DigestSendResult> {
  const { data, error } = await supabase.functions.invoke('health-digest', {
    body: { mode: 'now', recipients: recipients ?? [] },
  });
  if (error) throw new Error(error.message);

  const payload = asRecord(data);
  const result: DigestSendResult = {
    sent: payload.sent === true,
    findings: typeof payload.findings === 'number' ? payload.findings : 0,
    recipients: Array.isArray(payload.recipients)
      ? payload.recipients.filter((item): item is string => typeof item === 'string')
      : [],
    message:
      typeof payload.message === 'string' && payload.message.trim()
        ? payload.message
        : 'Digest finished.',
  };
  if (!result.sent && payload.error) throw new Error(result.message);
  return result;
}