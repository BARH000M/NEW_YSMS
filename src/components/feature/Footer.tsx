import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { contactInfo } from '@/mocks/college';

export default function Footer() {
  const { t } = useTranslation();

  const contacts = [
    { icon: 'ri-phone-line', label: t('footer.contact'), value: contactInfo.phoneDisplay, href: `tel:${contactInfo.phone}`, ltr: true },
    { icon: 'ri-mail-line', label: t('footer.emailUs'), value: contactInfo.email, href: `mailto:${contactInfo.email}`, ltr: true },
    { icon: 'ri-map-pin-line', label: t('footer.address'), value: t('address'), href: '/contact', ltr: false },
  ];

  const socials = [
    { icon: 'ri-whatsapp-line', href: contactInfo.whatsapp, label: 'WhatsApp' },
    { icon: 'ri-facebook-fill', href: contactInfo.facebook, label: 'Facebook' },
    { icon: 'ri-instagram-line', href: contactInfo.instagram, label: 'Instagram' },
  ];

  const programLinks = ['chineseDiploma', 'business', 'hsk', 'kids', 'scholarship'];

  return (
    <footer className="bg-accent-50 border-t border-accent-200">
      <div className="px-4 md:px-6 py-14 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {contacts.map((contact) => (
            <div key={contact.label} className="flex items-start gap-4 bg-background-50 border border-accent-200 rounded-lg p-5">
              <span className="w-11 h-11 flex items-center justify-center rounded-full bg-primary-500 text-background-50 text-lg shrink-0">
                <i className={contact.icon} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-foreground-500">{contact.label}</span>
                {contact.href === '/contact' ? (
                  <Link to="/contact" className="block text-sm font-semibold mt-0.5 break-words hover:text-primary-600 cursor-pointer">
                    {contact.value}
                  </Link>
                ) : (
                  <a href={contact.href} className="block text-sm font-semibold mt-0.5 break-words hover:text-primary-600 cursor-pointer" dir={contact.ltr ? 'ltr' : undefined}>
                    {contact.value}
                  </a>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <img src={contactInfo.logo} alt={t('brand.name')} title={t('brand.name')} className="h-14 w-auto object-contain" />
            <p className="text-sm text-foreground-700 mt-4 leading-relaxed">{t('footer.about')}</p>
            <div className="flex gap-2 mt-5">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-background-50 border border-accent-300 text-foreground-800 hover:bg-primary-500 hover:text-background-50 cursor-pointer"
                >
                  <i className={social.icon} />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="font-heading text-lg mb-4"><Link to="/">{t('footer.quickLinks')}</Link></h4>
            <ul className="space-y-2 text-sm text-foreground-700">
              <li><Link to="/" className="hover:text-primary-600 whitespace-nowrap">{t('nav.home')}</Link></li>
              <li><Link to="/#about" className="hover:text-primary-600 whitespace-nowrap">{t('nav.about')}</Link></li>
              <li><Link to="/#news" className="hover:text-primary-600 whitespace-nowrap">{t('nav.news')}</Link></li>
              <li><Link to="/admission" className="hover:text-primary-600 whitespace-nowrap">{t('nav.admission')}</Link></li>
              <li><Link to="/complain" className="hover:text-primary-600 whitespace-nowrap">{t('nav.complain')}</Link></li>
              <li><Link to="/contact" className="hover:text-primary-600 whitespace-nowrap">{t('nav.contact')}</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="font-heading text-lg mb-4"><Link to="/#programs">{t('footer.programs')}</Link></h4>
            <ul className="space-y-2 text-sm text-foreground-700">
              {programLinks.map((id) => (
                <li key={id}>
                  <Link to="/#programs" className="hover:text-primary-600">{t(`programs.items.${id}.title`)}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h4 className="font-heading text-lg mb-4"><Link to="/contact">{t('footer.findUs')}</Link></h4>
            <div className="w-full h-44 rounded-lg overflow-hidden border border-accent-200 bg-background-50">
              <iframe title={t('contact.map.title')} src={contactInfo.mapEmbed} className="w-full h-full border-0" loading="lazy" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary-600 text-background-50 text-xs py-4 px-4 flex flex-col sm:flex-row items-center justify-center gap-1">
        <span>{t('footer.rights')}</span>
      </div>

      <a
        href={contactInfo.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('action.chatWhatsapp')}
        className="fixed bottom-5 end-5 z-40 w-12 h-12 flex items-center justify-center rounded-full bg-secondary-500 text-background-50 text-2xl cursor-pointer"
      >
        <i className="ri-whatsapp-line" />
      </a>
    </footer>
  );
}