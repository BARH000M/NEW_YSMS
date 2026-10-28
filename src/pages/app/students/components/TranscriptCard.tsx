import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/app/ui';
import type { Tone } from '@/components/app/ui';
import type { TranscriptYear } from '@/utils/transcript';
import { formatDate } from '@/utils/date';

const STATUS_TONE: Record<string, Tone> = {
  enrolled: 'secondary',
  promoted: 'primary',
  repeated: 'accent',
  transferred: 'neutral',
  graduated: 'accent',
  withdrawn: 'danger',
};

function StatusPillLike({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'}>
      {t(`app.enroll.status.${status}`, { defaultValue: status })}
    </Badge>
  );
}

export default function TranscriptCard({
  year,
  canWrite,
  onEdit,
  onDelete,
  busy,
}: {
  year: TranscriptYear;
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const { enrollment, papers, average } = year;

  const place =
    [enrollment.classes?.name, enrollment.sections?.name].filter(Boolean).join(' / ') ||
    t('app.enroll.noPlacement');

  return (
    <div className="rounded-md border border-background-200 bg-background-50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground-950">
              {enrollment.academic_years?.name ?? '—'}
            </span>
            {enrollment.academic_years?.is_current ? (
              <Badge tone="accent">{t('app.enroll.current')}</Badge>
            ) : null}
            <StatusPillLike status={enrollment.status} />
          </div>
          <p className="text-[11px] text-foreground-600 mt-0.5 truncate">
            {place}
            {enrollment.roll_no ? ` · ${t('app.enroll.rollNo')} ${enrollment.roll_no}` : ''}
            {enrollment.result ? ` · ${enrollment.result}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-end">
            <p className="text-[10px] font-semibold text-foreground-500">{t('app.enroll.average')}</p>
            <p className="text-sm font-semibold text-foreground-950 tabular-nums">
              {average === null ? '—' : `${average}%`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            disabled={papers.length === 0}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700 disabled:text-foreground-400 disabled:cursor-default cursor-pointer whitespace-nowrap"
          >
            <i className={open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
            {papers.length} {t('app.enroll.papers')}
          </button>
        </div>
      </div>

      {enrollment.started_on || enrollment.ended_on ? (
        <div className="px-3 pb-2 text-[10px] text-foreground-500 flex flex-wrap gap-x-3 gap-y-1">
          {enrollment.started_on ? (
            <span>
              {t('app.enroll.startedOn')}: {formatDate(enrollment.started_on, i18n.language)}
            </span>
          ) : null}
          {enrollment.ended_on ? (
            <span>
              {t('app.enroll.endedOn')}: {formatDate(enrollment.ended_on, i18n.language)}
            </span>
          ) : null}
        </div>
      ) : null}

      {open && papers.length > 0 ? (
        <div className="border-t border-background-200 px-3 py-2 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr>
                <th className="text-start text-[10px] font-semibold uppercase tracking-wide text-foreground-500 py-1.5">
                  {t('app.enroll.subject')}
                </th>
                <th className="text-start text-[10px] font-semibold uppercase tracking-wide text-foreground-500 py-1.5">
                  {t('app.enroll.exam')}
                </th>
                <th className="text-end text-[10px] font-semibold uppercase tracking-wide text-foreground-500 py-1.5">
                  {t('app.enroll.marks')}
                </th>
                <th className="text-end text-[10px] font-semibold uppercase tracking-wide text-foreground-500 py-1.5">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {papers.map((paper, index) => (
                <tr key={`${paper.subjectName}-${paper.examName}-${index}`} className="border-t border-background-100">
                  <td className="py-1.5 text-xs text-foreground-900">{paper.subjectName}</td>
                  <td className="py-1.5 text-[11px] text-foreground-600">{paper.examName}</td>
                  <td className="py-1.5 text-xs text-end tabular-nums text-foreground-800">
                    {paper.obtained} / {paper.maxMarks}
                  </td>
                  <td className="py-1.5 text-xs text-end tabular-nums font-semibold text-foreground-950">
                    {paper.percent === null ? '—' : paper.percent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {canWrite ? (
        <div className="flex items-center gap-3 border-t border-background-200 px-3 py-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground-700 hover:text-primary-700 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-edit-line" />
            {t('app.common.edit')}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground-500 hover:text-primary-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-delete-bin-line" />
            {t('app.common.delete')}
          </button>
        </div>
      ) : null}
    </div>
  );
}