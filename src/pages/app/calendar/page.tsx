import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchEvents } from '@/api/college';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';

const typeTone: Record<string, 'primary' | 'accent' | 'secondary' | 'neutral' | 'danger'> = {
  exam: 'primary',
  meeting: 'accent',
  holiday: 'secondary',
  event: 'neutral',
  general: 'neutral',
};

const fmt = (value: string, lang: string) =>
  new Date(value).toLocaleString(lang === 'ar' ? 'ar-EG' : lang, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const state = useAsync(fetchEvents, []);

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;

  const events = state.data ?? [];
  const now = Date.now();
  const upcoming = events.filter((event) => new Date(event.starts_at).getTime() >= now);
  const past = events.filter((event) => new Date(event.starts_at).getTime() < now);

  const renderTable = (list: typeof events) => (
    <TableWrap>
      <thead className="bg-background-100 border-b border-background-200">
        <tr>
          <Th>{t('app.common.name')}</Th>
          <Th>{t('app.calendar.type')}</Th>
          <Th>{t('app.calendar.audience')}</Th>
          <Th>{t('app.calendar.starts')}</Th>
          <Th>{t('app.calendar.ends')}</Th>
        </tr>
      </thead>
      <tbody>
        {list.map((event) => (
          <Row key={event.id}>
            <Td className="text-sm font-medium text-foreground-950">{event.title}</Td>
            <Td>
              <Badge tone={typeTone[event.type] ?? 'neutral'}>
                {t(`app.calendar.${event.type}`, { defaultValue: event.type })}
              </Badge>
            </Td>
            <Td className="text-xs">{event.audience}</Td>
            <Td className="text-xs whitespace-nowrap">{fmt(event.starts_at, i18n.language)}</Td>
            <Td className="text-xs whitespace-nowrap">{event.ends_at ? fmt(event.ends_at, i18n.language) : '—'}</Td>
          </Row>
        ))}
      </tbody>
    </TableWrap>
  );

  return (
    <>
      <PageHeader title={t('app.calendar.title')} subtitle={t('app.calendar.subtitle')} />

      <Card className="mb-3 md:mb-4">
        <div className="px-4 md:px-5 py-3 border-b border-background-200">
          <h2 className="text-sm font-semibold text-foreground-900">{t('app.dash.upcomingEvents')}</h2>
        </div>
        {upcoming.length === 0 ? <EmptyState label={t('app.calendar.noEvents')} icon="ri-calendar-line" /> : renderTable(upcoming)}
      </Card>

      <Card>
        <div className="px-4 md:px-5 py-3 border-b border-background-200">
          <h2 className="text-sm font-semibold text-foreground-900">{t('app.calendar.title')}</h2>
        </div>
        {past.length === 0 ? <EmptyState label={t('app.calendar.noEvents')} icon="ri-calendar-line" /> : renderTable(past)}
      </Card>
    </>
  );
}