import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppRole } from '@/api/types';
import { visibleGroups } from '@/components/app/navConfig';
import type { NavItem } from '@/components/app/navConfig';
import { Card, CardHeader } from '@/components/app/ui';

/**
 * Each role gets its own landing order. The list is resolved against the
 * sidebar so a link can never point at a route that role cannot open.
 */
const ROLE_PRIORITY: Record<AppRole, string[]> = {
  super_admin: [
    '/app/students',
    '/app/fees',
    '/app/admissions',
    '/app/academics',
    '/app/attendance',
    '/app/fees/outstanding',
    '/app/library',
    '/app/staff',
    '/app/roles',
  ],
  admin: [
    '/app/students',
    '/app/fees',
    '/app/admissions',
    '/app/attendance',
    '/app/fees/outstanding',
    '/app/exams',
    '/app/staff',
    '/app/roles',
  ],
  teacher: ['/app/attendance', '/app/exams/marks', '/app/portal/teacher', '/app/reports', '/app/lms/assignments', '/app/students'],
  accountant: ['/app/fees', '/app/fees/outstanding', '/app/reports/finance-chart', '/app/fees/ledger', '/app/finance/expenses', '/app/staff/payroll', '/app/reports/collection', '/app/messages'],
  receptionist: ['/app/front-office/visitors', '/app/front-office/enquiries', '/app/front-office/calls', '/app/admissions', '/app/students'],
  librarian: ['/app/library', '/app/downloads', '/app/messages', '/app/students', '/app/lms/courses', '/app/calendar'],
  student: [
    '/app/portal/student',
    '/app/messages',
    '/app/notices',
    '/app/downloads',
    '/app/library',
    '/app/lms/assignments',
    '/app/lms/courses',
    '/app/calendar',
  ],
  parent: ['/app/portal/student', '/app/messages', '/app/notices', '/app/downloads', '/app/library', '/app/calendar'],
};

const TILE_TONES = ['primary', 'accent', 'secondary'] as const;

const tileIconClass: Record<(typeof TILE_TONES)[number], string> = {
  primary: 'bg-primary-100 text-primary-700 border-primary-200',
  accent: 'bg-accent-100 text-accent-900 border-accent-300',
  secondary: 'bg-secondary-100 text-secondary-900 border-secondary-200',
};

export default function QuickLinks({ role, limit = 8 }: { role: AppRole | null; limit?: number }) {
  const { t } = useTranslation();

  const items = useMemo(() => {
    if (!role) return [];
    const flat: NavItem[] = visibleGroups(role).flatMap((group) => group.items);
    const byPath = new Map(flat.map((item) => [item.to, item]));
    const ordered: NavItem[] = [];
    (ROLE_PRIORITY[role] ?? []).forEach((path) => {
      const hit = byPath.get(path);
      if (hit) ordered.push(hit);
    });
    flat.forEach((item) => {
      if (ordered.length < limit && !ordered.some((picked) => picked.to === item.to)) ordered.push(item);
    });
    return ordered.slice(0, limit);
  }, [role, limit]);

  if (items.length === 0) return null;

  return (
    <Card className="mb-3 md:mb-4">
      <CardHeader title={t('app.dash.quickLinks')} />
      <div className="p-3 md:p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
        {items.map((item, index) => {
          const tone = TILE_TONES[index % TILE_TONES.length];
          return (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-center gap-2.5 border border-background-200 rounded-lg bg-background-50 px-3 py-2.5 hover:border-primary-300 hover:bg-background-100 cursor-pointer transition-colors min-w-0"
            >
              <span className={`w-8 h-8 rounded-md border flex items-center justify-center shrink-0 ${tileIconClass[tone]}`}>
                <i className={`${item.icon} text-base`} />
              </span>
              <span className="text-xs font-semibold text-foreground-900 truncate">{t(item.key)}</span>
              <i className="ri-arrow-right-up-line ms-auto text-foreground-400 group-hover:text-primary-600 shrink-0" />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}