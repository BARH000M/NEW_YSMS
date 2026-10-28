import { useTranslation } from 'react-i18next';
import { Card, EmptyState, Row, TableWrap, Td, Th } from '@/components/app/ui';

export interface FollowUpRow {
  id: string;
  name: string;
  studentNo: string | null;
  className: string;
  rate: number;
  absent: number;
  total: number;
}

export default function FollowUpList({ rows }: { rows: FollowUpRow[] }) {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="flex items-center justify-between gap-2 px-4 md:px-5 py-3 border-b border-background-200">
        <h2 className="text-sm font-semibold text-foreground-900">{t('app.attendance.followUpTitle')}</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 text-primary-900 px-2.5 py-0.5 text-[11px] font-bold tabular-nums">
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <EmptyState label={t('app.attendance.followUpEmpty')} icon="ri-shield-check-line" />
      ) : (
        <TableWrap>
          <thead className="bg-background-100 border-b border-background-200">
            <tr>
              <Th>{t('app.common.name')}</Th>
              <Th>{t('app.reports.class')}</Th>
              <Th>{t('app.attendance.absences')}</Th>
              <Th className="text-end">{t('app.attendance.rate')}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row key={row.id}>
                <Td>
                  <p className="text-sm font-medium text-foreground-950 truncate max-w-[180px]">{row.name}</p>
                  <p className="text-[11px] text-foreground-500 tabular-nums">{row.studentNo ?? '—'}</p>
                </Td>
                <Td className="text-xs">{row.className}</Td>
                <Td className="text-xs tabular-nums whitespace-nowrap">
                  {row.absent} / {row.total}
                </Td>
                <Td className="text-end">
                  <span className="inline-flex items-center justify-center rounded-full bg-primary-100 text-primary-900 px-2.5 py-0.5 text-[11px] font-bold tabular-nums">
                    {row.rate}%
                  </span>
                </Td>
              </Row>
            ))}
          </tbody>
        </TableWrap>
      )}
    </Card>
  );
}