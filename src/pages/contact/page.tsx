import { useTranslation } from 'react-i18next';
import SiteLayout from '@/components/feature/SiteLayout';
import PageBanner from '@/components/feature/PageBanner';
import { contactInfo } from '@/mocks/college';
import ContactForm from './components/ContactForm';

export default function Contact() {
  const { t } = useTranslation();

  const cards = [
    { icon: 'ri-phone-line', label: t('contact.cards.phone'), value: contactInfo.phoneDisplay, href: `tel:${contactInfo.phone}`, ltr: true },
    { icon: 'ri-mail-line', label: t('contact.cards.email'), value: contactInfo.email, href: `mailto:${contactInfo.email}`, ltr: true },
    { icon: 'ri-map-pin-line', label: t('contact.cards.address'), value: t('address'), href: '', ltr: false },
    { icon: 'ri-time-line', label: t('contact.cards.hours'), value: t('contact.cards.hoursValue'), href: '', ltr: false },
  ];

  const socials = [
    { icon: 'ri-whatsapp-line', href: contactInfo.whatsapp, label: 'WhatsApp' },
    { icon: 'ri-facebook-fill', href: contactInfo.facebook, label: 'Facebook' },
    { icon: 'ri-instagram-line', href: contactInfo.instagram, label: 'Instagram' },
  ];

  return (
    <SiteLayout>
      <PageBanner
        title={t('contact.title')}
        subtitle={t('contact.subtitle')}
        crumb={t('nav.contact')}
        image="https://readdy.ai/api/search-image?query=Welcoming%20college%20reception%20area%20with%20warm%20cream%20walls%2C%20wooden%20desk%2C%20red%20accent%20details%20and%20soft%20daylight%2C%20editorial%20interior%20photography%2C%20clean%20calm%20composition&width=1920&height=900&seq=sai-banner-contact&orientation=landscape"
      />

      <section className="bg-background-50 py-14 md:py-20 px-4 md:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((card) => {
            const inner = (
              <>
                <span className="w-11 h-11 flex items-center justify-center rounded-full bg-primary-500 text-background-50 text-lg">
                  <i className={card.icon} />
                </span>
                <span className="block text-xs text-foreground-500 mt-4">{card.label}</span>
                <span className="block text-sm font-semibold mt-1 leading-relaxed" dir={card.ltr ? 'ltr' : undefined}>
                  {card.value}
                </span>
              </>
            );
            return card.href ? (
              <a key={card.label} href={card.href} className="bg-background-100 border border-background-200 rounded-lg p-5 hover:border-primary-300 transition-colors cursor-pointer">
                {inner}
              </a>
            ) : (
              <div key={card.label} className="bg-background-100 border border-background-200 rounded-lg p-5">
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-background-100 py-14 md:py-20 px-4 md:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-3">
            <ContactForm />
          </div>

          <aside className="lg:col-span-2 space-y-6">
            <div className="bg-background-50 border border-background-200 rounded-lg overflow-hidden">
              <div className="w-full h-64">
                <iframe title={t('contact.map.title')} src={contactInfo.mapEmbed} className="w-full h-full border-0" loading="lazy" />
              </div>
              <div className="p-5">
                <h3 className="font-heading text-lg">{t('contact.map.title')}</h3>
                <p className="text-sm text-foreground-600 mt-2 leading-relaxed">{t('address')}</p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Haddad+street+Sanaa+Yemen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 mt-3 cursor-pointer"
                >
                  {t('action.viewMap')}
                  <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-right-line rtl:rotate-180" /></span>
                </a>
              </div>
            </div>

            <div className="bg-accent-50 border border-accent-200 rounded-lg p-6">
              <h3 className="font-heading text-lg">{t('contact.social.title')}</h3>
              <div className="flex gap-2 mt-4">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-background-50 border border-accent-300 text-foreground-800 hover:bg-primary-500 hover:text-background-50 cursor-pointer text-lg"
                  >
                    <i className={social.icon} />
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}