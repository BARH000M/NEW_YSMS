import { useTranslation } from 'react-i18next';
import { systemModuleGroups } from '@/mocks/systemShowcase';

export default function ModuleGroups() {
  const { t } = useTranslation();

  return (
    <section className="bg-background-50 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div className="max-w-xl">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary-600">{t('system.modules.eyebrow')}</span>
            <h2 className="font-heading text-2xl md:text-4xl mt-3 leading-tight">{t('system.modules.title')}</h2>
          </div>
          <p className="text-sm text-foreground-600 max-w-md leading-relaxed">{t('system.modules.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          {systemModuleGroups.map((group) => (
            <div key={group.id} className="bg-background-100/70 border border-background-200 rounded-lg p-4 md:p-6">
              <div className="flex items-start gap-3 pb-4 border-b border-background-200">
                <span className="w-10 h-10 shrink-0 flex items-center justify-center rounded-md bg-background-50 border border-background-300/70 text-primary-600">
                  <i className={group.icon} />
                </span>
                <div>
                  <h3 className="font-heading text-lg leading-snug">{t(`system.modules.groups.${group.id}.title`)}</h3>
                  <p className="text-xs text-foreground-600 mt-1 leading-relaxed">{t(`system.modules.groups.${group.id}.desc`)}</p>
                </div>
              </div>

              <ul className="mt-2">
                {group.modules.map((module) => (
                  <li key={module.id} className="flex items-start gap-3 py-3 border-b border-background-200/60 last:border-b-0">
                    <span className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md bg-background-50 text-secondary-600 mt-0.5">
                      <i className={module.icon} />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground-900 leading-snug">{t(`system.modules.items.${module.id}.title`)}</span>
                      <p className="text-xs text-foreground-600 mt-1 leading-relaxed">{t(`system.modules.items.${module.id}.desc`)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}