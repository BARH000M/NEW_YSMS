import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Props {
  title: string;
  subtitle: string;
  crumb: string;
  image: string;
}

export default function PageBanner({ title, subtitle, crumb, image }: Props) {
  const { t } = useTranslation();

  return (
    <section className="relative w-full h-[360px] md:h-[440px] overflow-hidden">
      <img src={image} alt={title} title={title} className="absolute inset-0 w-full h-full object-cover object-top" />
      <div className="absolute inset-0 bg-gradient-to-b from-foreground-950/75 via-foreground-950/60 to-foreground-950/80" />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-4 pt-20">
        <nav className="flex items-center gap-2 text-xs text-background-200 mb-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-accent-300 cursor-pointer">{t('nav.home')}</Link>
          <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-right-s-line" /></span>
          <span className="text-accent-300">{crumb}</span>
        </nav>
        <h1 className="font-heading text-background-50 text-3xl md:text-5xl leading-tight max-w-3xl">{title}</h1>
        <p className="text-background-100 text-sm md:text-base max-w-2xl mt-4 leading-relaxed">{subtitle}</p>
      </div>
    </section>
  );
}