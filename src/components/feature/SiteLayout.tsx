import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import ScrollManager from './ScrollManager';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background-50 flex flex-col">
      <ScrollManager />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}