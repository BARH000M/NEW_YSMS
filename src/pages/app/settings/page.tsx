import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from '@/hooks/useAsync';
import { fetchAuditLog, fetchInstitution, fetchModuleFlags, fetchSettings, toggleModule } from '@/api/college';
import { formatDate } from '@/utils/date';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Row,
  TableWrap,
  Td,
  Th,
} from '@/components/app/ui';

const MODULE_LABEL: Record<string, string> = {
  admissions: 'app.nav.admissions',
  students: 'app.nav.students',
  staff: 'app.nav.staff',
  settings: 'app.nav.settings',
  comms: 'app.nav.frontOffice',
  front_office: 'app.nav.frontOffice',
};

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [institution, modules, settings, audit] = await Promise.all([
      fetchInstitution(),
      fetchModuleFlags(),
      fetchSettings(),
      fetchAuditLog(),
    ]);
    return { institution, modules, settings, audit };
  }, []);

  if (state.loading) return <LoadingBlock />;
  if (state.error || !state.data) return <ErrorState message={state.error ?? 'No data'} onRetry={state.reload} />;

  const { institution, modules, settings, audit } = state.data;

  const handleToggle = async (id: string, enabled: boolean) => {
    setActionError(null);
    setBusyId(id);
    try {
      await toggleModule(id, enabled);
      state.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const general = settings.find((row) => row.key === 'general')?.value as
    | { timezone?: string; currency?: string; locale?: string }
    | undefined;

  return (
    <>
      <PageHeader title={t('app.settings.title')} subtitle={t('app.settings.subtitle')} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <Card className="lg:col-span-1">
          <CardHeader title={t('app.settings.institution')} />
          <div className="p-4 md:p-5 flex flex-col gap-3 text-sm">
            <div>
              <p className="text-[11px] font-semibold text-foreground-500">{t('app.common.name')}</p>
              <p className="text-foreground-950 font-medium">{institution?.name ?? '—'}</p>
              <p className="text-xs text-foreground-600 mt-0.5">{institution?.name_ar ?? ''}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground-500">{t('app.settings.contact')}</p>
              <p className="text-xs text-foreground-800" dir="ltr">
                {institution?.phone ?? '—'}
              </p>
              <p className="text-xs text-foreground-800 break-all" dir="ltr">
                {institution?.email ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground-500">{t('app.settings.address')}</p>
              <p className="text-xs text-foreground-800">{institution?.address ?? '—'}</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge tone="secondary">{general?.timezone ?? institution?.timezone ?? '—'}</Badge>
              <Badge tone="accent">{general?.currency ?? institution?.currency ?? '—'}</Badge>
              <Badge tone="neutral">{(general?.locale ?? i18n.language).toUpperCase()}</Badge>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t('app.settings.modules')} />
          <div className="p-4 md:p-5">
            <p className="text-[11px] text-foreground-500 mb-3 leading-relaxed">{t('app.settings.modulesNote')}</p>
            {actionError && (
              <p className="mb-3 text-xs text-primary-800 bg-primary-100 border border-primary-200 rounded-md px-3 py-2">
                {actionError}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {modules.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between gap-2 border border-background-200 rounded-md px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground-900 truncate">
                      {MODULE_LABEL[module.module]
                        ? t(MODULE_LABEL[module.module])
                        : module.module.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-foreground-500">
                      {module.is_enabled ? t('app.settings.enabled') : t('app.settings.disabled')}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={module.is_enabled}
                    aria-label={module.module}
                    disabled={busyId === module.id}
                    onClick={() => void handleToggle(module.id, !module.is_enabled)}
                    className={`w-10 h-5 rounded-full relative shrink-0 cursor-pointer transition-colors disabled:opacity-50 ${
                      module.is_enabled ? 'bg-secondary-500' : 'bg-background-400'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-background-50 transition-all ${
                        module.is_enabled ? 'start-[22px]' : 'start-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-3 md:mt-4">
        <CardHeader title={t('app.settings.auditLog')} />
        <div className="px-4 md:px-5 pt-3">
          <p className="text-[11px] text-foreground-500">{t('app.settings.auditNote')}</p>
        </div>
        {audit.length === 0 ? (
          <EmptyState label={t('app.settings.noAudit')} icon="ri-history-line" />
        ) : (
          <TableWrap>
            <thead className="bg-background-100 border-b border-background-200">
              <tr>
                <Th>{t('app.settings.when')}</Th>
                <Th>{t('app.settings.action')}</Th>
                <Th>{t('app.settings.table')}</Th>
                <Th>{t('app.settings.actor')}</Th>
              </tr>
            </thead>
            <tbody>
              {audit.map((entry) => (
                <Row key={entry.id}>
                  <Td className="text-xs whitespace-nowrap">{formatDate(entry.created_at, i18n.language)}</Td>
                  <Td>
                    <Badge tone="neutral">{entry.action}</Badge>
                  </Td>
                  <Td className="text-xs">{entry.table_name ?? '—'}</Td>
                  <Td className="text-xs text-foreground-500">
                    {entry.actor_id ? `${entry.actor_id.slice(0, 8)}…` : '—'}
                  </Td>
                </Row>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}