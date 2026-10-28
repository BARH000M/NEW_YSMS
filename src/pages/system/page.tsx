import { useTranslation } from 'react-i18next';
import SiteLayout from '@/components/feature/SiteLayout';
import PageBanner from '@/components/feature/PageBanner';
import { systemImages } from '@/mocks/systemShowcase';
import Intro from './components/Intro';
import RolesGrid from './components/RolesGrid';
import ModuleGroups from './components/ModuleGroups';
import HowItWorks from './components/HowItWorks';
import PlatformSection from './components/PlatformSection';
import SystemCta from './components/SystemCta';

export default function System() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <PageBanner
        title={t('system.hero.title')}
        subtitle={t('system.hero.subtitle')}
        crumb={t('system.hero.crumb')}
        image={systemImages.banner}
      />
      <Intro />
      <RolesGrid />
      <ModuleGroups />
      <HowItWorks />
      <PlatformSection />
      <SystemCta />
    </SiteLayout>
  );
}