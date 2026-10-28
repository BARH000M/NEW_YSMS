import { useTranslation } from 'react-i18next';
import { systemRoles } from '@/mocks/systemShowcase';

export default function RolesGrid() {
  const { t } = useTranslation();

  return (
    <section className="bg-background-100 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary-600">{t('system.roles.eyebrow')}</span>
          <h2 className="font-heading text-2xl md:text-4xl mt-3 leading-tight">{t('system.roles.title')}</h2>
          <p className="text-sm text-foreground-600 mt-4 leading-relaxed">{t('system.roles.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mt-10">
          {systemRoles.map((role) => (
            <article
              key={role.id}
              className="bg-background-50 border border-background-200 rounded-lg p-5 hover:border-primary-300 transition-colors"
            >
              <span className="w-11 h-11 flex items-center justify-center rounded-md bg-primary-100 text-primary-600 text-xl">
                <i className={role.icon} />
              </span>
              <h3 className="font-heading text-base md:text-lg mt-4 leading-snug">{t(`system.roles.items.${role.id}.title`)}</h3>
              <p className="text-xs md:text-sm text-foreground-600 mt-2 leading-relaxed">{t(`system.roles.items.${role.id}.desc`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}