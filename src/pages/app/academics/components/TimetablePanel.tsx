import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/app/Modal';
import { inputClass, labelClass } from '@/components/feature/formStyles';
import { Card, EmptyState } from '@/components/app/ui';
import { deleteTimetableSlot, saveTimetableSlot } from '@/api/campus';
import type { TimetableSlotRow } from '@/api/campus';
import type { SchoolClass, Section, Staff, Subject } from '@/api/types';

const DAYS = [0, 1, 2, 3, 4, 5, 6];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const DAY_KEYS: Record<number, string> = {
  0: 'app.acad.day.mon',
  1: 'app.acad.day.tue',
  2: 'app.acad.day.wed',
  3: 'app.acad.day.thu',
  4: 'app.acad.day.fri',
  5: 'app.acad.day.sat',
  6: 'app.acad.day.sun',
};

const trimTime = (value: string | null) => (value ? value.slice(0, 5) : '');

export default function TimetablePanel({
  classes,
  sections,
  subjects,
  staff,
  slots,
  onChanged,
}: {
  classes: SchoolClass[];
  sections: Section[];
  subjects: Subject[];
  staff: Staff[];
  slots: TimetableSlotRow[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const classSections = sections.filter((item) => item.class_id === classId);
  const [sectionId, setSectionId] = useState(classSections[0]?.id ?? '');
  const [editing, setEditing] = useState<{ day: number; period: number } | null>(null);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [teacherId, setTeacherId] = useState('');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('08:45');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectName = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subject) => map.set(subject.id, subject.name));
    return map;
  }, [subjects]);

  const activeSlots = slots.filter((slot) => slot.section_id === sectionId);

  const findSlot = (day: number, period: number) =>
    activeSlots.find((slot) => slot.day_of_week === day && slot.period === period);

  const openCell = (day: number, period: number) => {
    const existing = findSlot(day, period);
    setEditing({ day, period });
    setSubjectId(existing?.subject_id ?? subjects[0]?.id ?? '');
    setTeacherId(existing?.teacher_id ?? '');
    setStart(trimTime(existing?.start_time ?? null) || '08:00');
    setEnd(trimTime(existing?.end_time ?? null) || '08:45');
    setError(null);
  };

  const save = async () => {
    if (!editing || !sectionId || !subjectId) {
      setError(t('app.acad.needSectionSubject'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveTimetableSlot({
        sectionId,
        subjectId,
        teacherId: teacherId || null,
        dayOfWeek: editing.day,
        period: editing.period,
        startTime: start,
        endTime: end,
      });
      setEditing(null);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('app.common.errorDesc'));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!editing) return;
    const existing = findSlot(editing.day, editing.period);
    if (!existing) {
      setEditing(null);
      return;
    }
    await deleteTimetableSlot(existing.id);
    setEditing(null);
    onChanged();
  };

  return (
    <>
      <Card className="p-3 md:p-4 mb-3 md:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                const next = sections.find((item) => item.class_id === event.target.value);
                setSectionId(next?.id ?? '');
              }}
              className="box-border bg-background-50 border border-background-300 rounded-md px-3 py-2 text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
              aria-label={t('app.acad.className')}
            >
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
            <select
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              className="box-border bg-background-50 border border-background-300 rounded-md px-3 py-2 text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
              aria-label={t('app.acad.sections')}
            >
              {classSections.length === 0 ? <option value="">—</option> : null}
              {classSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-foreground-500">{t('app.acad.timetableHint')}</p>
        </div>
      </Card>

      {!sectionId ? (
        <Card>
          <EmptyState icon="ri-calendar-2-line" label={t('app.acad.noSectionsYet')} />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead className="bg-background-100 border-b border-background-200">
                <tr>
                  <th className="text-start text-[11px] font-semibold uppercase tracking-wide text-foreground-500 px-3 py-2.5 w-20">
                    {t('app.acad.period')}
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className="text-start text-[11px] font-semibold uppercase tracking-wide text-foreground-500 px-3 py-2.5 whitespace-nowrap"
                    >
                      {t(DAY_KEYS[day])}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period} className="border-b border-background-100 last:border-b-0">
                    <td className="px-3 py-2 text-xs font-semibold text-foreground-700 tabular-nums">
                      {t('app.acad.periodShort', { n: period })}
                    </td>
                    {DAYS.map((day) => {
                      const slot = findSlot(day, period);
                      const name = slot?.subject_id ? subjectName.get(slot.subject_id) : null;
                      return (
                        <td key={day} className="px-1.5 py-1.5 align-top">
                          <button
                            type="button"
                            onClick={() => openCell(day, period)}
                            className={`w-full min-h-[52px] text-start rounded-md border px-2 py-1.5 cursor-pointer transition-colors ${
                              name
                                ? 'bg-secondary-100 border-secondary-200 hover:border-secondary-400'
                                : 'bg-background-50 border-dashed border-background-300 hover:border-primary-400'
                            }`}
                          >
                            {name ? (
                              <>
                                <span className="block text-[11px] font-semibold text-foreground-950 truncate">
                                  {name}
                                </span>
                                <span className="block text-[10px] text-foreground-600 tabular-nums">
                                  {trimTime(slot?.start_time ?? null)}–{trimTime(slot?.end_time ?? null)}
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] text-foreground-400">+</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing && (
        <Modal
          title={t('app.acad.slotTitle', { day: t(DAY_KEYS[editing.day]), n: editing.period })}
          onClose={() => setEditing(null)}
        >
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="tt-subject">
                  {t('app.acad.subjects')}
                </label>
                <select
                  id="tt-subject"
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  className={inputClass}
                >
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="tt-teacher">
                  {t('app.acad.teacher')}
                </label>
                <select
                  id="tt-teacher"
                  value={teacherId}
                  onChange={(event) => setTeacherId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">{t('app.acad.noTeacher')}</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="tt-start">
                  {t('app.acad.startTime')}
                </label>
                <input
                  id="tt-start"
                  type="time"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className={labelClass} htmlFor="tt-end">
                  {t('app.acad.endTime')}
                </label>
                <input
                  id="tt-end"
                  type="time"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            {error && (
              <p className="text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => void clear()}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-md border border-background-300 text-xs font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-eraser-line" />
                {t('app.acad.clearSlot')}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-3.5 py-2.5 rounded-md border border-background-300 text-xs font-semibold text-foreground-700 whitespace-nowrap cursor-pointer"
                >
                  {t('app.common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save()}
                  className="px-4 py-2.5 rounded-md bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  {busy ? t('app.common.saving') : t('app.acad.saveSlot')}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}