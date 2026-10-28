import { supabase } from './supabaseClient';
import { fetchInstitution } from './college';

/** Who a message is addressed to. `user` means one named account only. */
export type MessageAudience = 'all' | 'staff' | 'teachers' | 'students' | 'parents' | 'user';

export interface MessageRow {
  id: string;
  sender_id: string | null;
  sender_name: string;
  sender_role: string | null;
  subject: string;
  body: string;
  audience: MessageAudience;
  recipient_id: string | null;
  created_at: string;
}

const fail = (message: string): never => {
  throw new Error(message);
};

/**
 * Inbox query. Row level security already narrows this to messages written by
 * the caller or addressed to their audience, so no client-side filtering is
 * required for safety.
 */
export async function fetchMessages(): Promise<MessageRow[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, sender_name, sender_role, subject, body, audience, recipient_id, created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) return fail(error.message);
    return (data ?? []) as MessageRow[];
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown backend error');
  }
}

/** The message ids the signed-in account has already opened. */
export async function fetchReadIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('message_reads').select('message_id');
    if (error) return fail(error.message);
    return ((data ?? []) as { message_id: string }[]).map((row) => row.message_id);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown backend error');
  }
}

export interface SendMessageInput {
  subject: string;
  body: string;
  audience: MessageAudience;
  senderName: string;
  senderRole?: string | null;
  recipientId?: string | null;
}

export async function sendMessage(input: SendMessageInput): Promise<void> {
  const institution = await fetchInstitution();
  const { data: auth } = await supabase.auth.getUser();
  const senderId = auth.user?.id ?? null;
  if (!senderId) throw new Error('Sign in again before sending a message.');

  const { error } = await supabase.from('messages').insert({
    institution_id: institution?.id ?? null,
    sender_id: senderId,
    sender_name: input.senderName.trim() || 'School Office',
    sender_role: input.senderRole ?? null,
    subject: input.subject.trim() || fail('A subject is required'),
    body: input.body.trim() || fail('A message body is required'),
    audience: input.audience,
    recipient_id: input.audience === 'user' ? input.recipientId || null : null,
  });
  if (error) throw new Error(error.message);
}

/** Marks one message as read for the signed-in account (idempotent). */
export async function markMessageRead(messageId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('message_reads')
    .upsert({ message_id: messageId, user_id: userId }, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from('messages').delete().eq('id', id);
  if (error) throw new Error(error.message);
}