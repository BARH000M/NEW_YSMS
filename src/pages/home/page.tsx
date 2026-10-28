import SiteLayout from '@/components/feature/SiteLayout';
import Hero from './components/Hero';
import About from './components/About';
import Programs from './components/Programs';
import News from './components/News';
import ServicesCta from './components/ServicesCta';

export default function Home() {
  return (
    <SiteLayout>
      <Hero />
      <About />
      <Programs />
      <News />
      <ServicesCta />
    </SiteLayout>
  );
}