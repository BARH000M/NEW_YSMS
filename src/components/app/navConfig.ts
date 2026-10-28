import type { AppRole } from '@/api/types';

export interface NavItem {
  key: string;
  to: string;
  icon: string;
  roles: AppRole[] | 'all';
  /** Match the path exactly (used where one route is the parent of others). */
  exact?: boolean;
}

export interface NavGroup {
  key: string;
  icon: string;
  items: NavItem[];
}

/** Every adult with console access — students and parents are NOT staff. */
const STAFF: AppRole[] = [
  'super_admin',
  'admin',
  'teacher',
  'accountant',
  'receptionist',
  'librarian',
];

/** Destinations a student or parent may open (their own record only). */
const SELF_SERVICE: AppRole[] = [...STAFF, 'student', 'parent'];

const ADMIN: AppRole[] = ['super_admin', 'admin'];
const OFFICE: AppRole[] = ['super_admin', 'admin', 'receptionist'];
const ACADEMIC: AppRole[] = ['super_admin', 'admin', 'teacher'];
const FINANCE: AppRole[] = ['super_admin', 'admin', 'accountant'];

/**
 * Single source of truth for the sidebar.
 * Ordered exactly like the reference console: Home → Front office → Students →
 * Finance → HR → Administration. Every entry points at a real, mounted route.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'app.navGroup.home',
    icon: 'ri-home-5-line',
    items: [
      { key: 'app.nav.dashboard', to: '/app', icon: 'ri-dashboard-line', roles: SELF_SERVICE, exact: true },
      { key: 'app.nav.teacherPortal', to: '/app/portal/teacher', icon: 'ri-presentation-line', roles: ACADEMIC },
      { key: 'app.nav.studentPortal', to: '/app/portal/student', icon: 'ri-graduation-cap-line', roles: SELF_SERVICE },
      {
        key: 'app.nav.admissions',
        to: '/app/admissions',
        icon: 'ri-file-list-3-line',
        roles: ['super_admin', 'admin', 'receptionist'],
      },
    ],
  },
  {
    key: 'app.navGroup.office',
    icon: 'ri-door-open-line',
    items: [
      { key: 'app.nav.enquiry', to: '/app/front-office/enquiries', icon: 'ri-question-answer-line', roles: OFFICE },
      { key: 'app.nav.visitors', to: '/app/front-office/visitors', icon: 'ri-book-2-line', roles: OFFICE },
      { key: 'app.nav.calls', to: '/app/front-office/calls', icon: 'ri-phone-line', roles: OFFICE },
      { key: 'app.nav.outgoingMail', to: '/app/front-office/mail/outgoing', icon: 'ri-send-plane-line', roles: OFFICE },
      { key: 'app.nav.incomingMail', to: '/app/front-office/mail/incoming', icon: 'ri-inbox-archive-line', roles: OFFICE },
      { key: 'app.nav.complaints', to: '/app/front-office/complaints', icon: 'ri-error-warning-line', roles: OFFICE },
    ],
  },
  {
    key: 'app.navGroup.students',
    icon: 'ri-team-line',
    items: [
      { key: 'app.nav.academics', to: '/app/academics', icon: 'ri-book-open-line', roles: ACADEMIC },
      { key: 'app.nav.students', to: '/app/students', icon: 'ri-user-3-line', roles: STAFF, exact: true },
      { key: 'app.nav.promote', to: '/app/students/promote', icon: 'ri-arrow-up-circle-line', roles: ADMIN },
      { key: 'app.nav.categories', to: '/app/students/categories', icon: 'ri-group-2-line', roles: [...ACADEMIC, 'receptionist'] },
      { key: 'app.nav.attendance', to: '/app/attendance', icon: 'ri-calendar-check-line', roles: ACADEMIC, exact: true },
      { key: 'app.nav.attendanceByDate', to: '/app/attendance/by-date', icon: 'ri-calendar-2-line', roles: ACADEMIC },
      { key: 'app.nav.exams', to: '/app/exams', icon: 'ri-draft-line', roles: ACADEMIC, exact: true },
      { key: 'app.nav.marks', to: '/app/exams/marks', icon: 'ri-edit-2-line', roles: ACADEMIC },
      { key: 'app.nav.assignments', to: '/app/lms/assignments', icon: 'ri-task-line', roles: [...ACADEMIC, 'student'] },
      { key: 'app.nav.courses', to: '/app/lms/courses', icon: 'ri-global-line', roles: [...ACADEMIC, 'student'] },
    ],
  },
  {
    key: 'app.navGroup.reports',
    icon: 'ri-file-chart-2-line',
    items: [
      { key: 'app.nav.reports', to: '/app/reports', icon: 'ri-file-chart-line', roles: ACADEMIC, exact: true },
      { key: 'app.nav.examMarks', to: '/app/reports/exam-marks', icon: 'ri-clipboard-line', roles: ACADEMIC },
      { key: 'app.nav.attendanceMonthly', to: '/app/reports/attendance-monthly', icon: 'ri-calendar-2-line', roles: ACADEMIC },
      { key: 'app.nav.evaluation', to: '/app/reports/evaluation', icon: 'ri-bar-chart-grouped-line', roles: ACADEMIC },
      { key: 'app.nav.feeStatement', to: '/app/reports/fee-statement', icon: 'ri-file-list-3-line', roles: FINANCE },
      { key: 'app.nav.balanceFees', to: '/app/reports/balance-fees', icon: 'ri-scales-3-line', roles: FINANCE },
      { key: 'app.nav.transactions', to: '/app/reports/transactions', icon: 'ri-exchange-dollar-line', roles: FINANCE },
      { key: 'app.nav.collection', to: '/app/reports/collection', icon: 'ri-pie-chart-line', roles: FINANCE },
      { key: 'app.nav.financeChart', to: '/app/reports/finance-chart', icon: 'ri-line-chart-line', roles: FINANCE },
    ],
  },
  {
    key: 'app.navGroup.campus',
    icon: 'ri-book-2-line',
    items: [
      {
        key: 'app.nav.messages',
        to: '/app/messages',
        icon: 'ri-mail-send-line',
        roles: SELF_SERVICE,
      },
      {
        key: 'app.nav.notices',
        to: '/app/notices',
        icon: 'ri-megaphone-line',
        roles: SELF_SERVICE,
      },
      {
        key: 'app.nav.downloads',
        to: '/app/downloads',
        icon: 'ri-download-cloud-2-line',
        roles: SELF_SERVICE,
      },
      {
        key: 'app.nav.library',
        to: '/app/library',
        icon: 'ri-book-read-line',
        roles: SELF_SERVICE,
      },
      {
        key: 'app.nav.transport',
        to: '/app/transport',
        icon: 'ri-bus-2-line',
        roles: [...OFFICE, 'accountant', 'student', 'parent'],
      },
      {
        key: 'app.nav.hostel',
        to: '/app/hostel',
        icon: 'ri-building-4-line',
        roles: [...OFFICE, 'student', 'parent'],
      },
    ],
  },
  {
    key: 'app.navGroup.finance',
    icon: 'ri-wallet-3-line',
    items: [
      { key: 'app.nav.fees', to: '/app/fees', icon: 'ri-receipt-line', roles: FINANCE, exact: true },
      { key: 'app.nav.outstanding', to: '/app/fees/outstanding', icon: 'ri-money-dollar-circle-line', roles: FINANCE },
      { key: 'app.nav.feeSetup', to: '/app/fees/setup', icon: 'ri-list-settings-line', roles: FINANCE },
      { key: 'app.nav.discounts', to: '/app/fees/discounts', icon: 'ri-coupon-2-line', roles: FINANCE },
      { key: 'app.nav.expenses', to: '/app/finance/expenses', icon: 'ri-exchange-dollar-line', roles: FINANCE },
      { key: 'app.nav.income', to: '/app/finance/income', icon: 'ri-arrow-down-circle-line', roles: FINANCE },
      { key: 'app.nav.ledger', to: '/app/fees/ledger', icon: 'ri-book-read-line', roles: FINANCE },
    ],
  },
  {
    key: 'app.navGroup.hr',
    icon: 'ri-briefcase-line',
    items: [
      { key: 'app.nav.staff', to: '/app/staff', icon: 'ri-user-star-line', roles: ['super_admin', 'admin', 'accountant'], exact: true },
      { key: 'app.nav.payroll', to: '/app/staff/payroll', icon: 'ri-hand-coin-line', roles: ['super_admin', 'admin', 'accountant'] },
    ],
  },
  {
    key: 'app.navGroup.admin',
    icon: 'ri-settings-4-line',
    items: [
      { key: 'app.nav.calendar', to: '/app/calendar', icon: 'ri-calendar-line', roles: SELF_SERVICE },
      { key: 'app.nav.roles', to: '/app/roles', icon: 'ri-shield-user-line', roles: ADMIN },
      { key: 'app.nav.accounts', to: '/app/account-links', icon: 'ri-link-m', roles: ADMIN },
      { key: 'app.nav.databaseHealth', to: '/app/database-health', icon: 'ri-database-2-line', roles: ADMIN },
      { key: 'app.nav.settings', to: '/app/settings', icon: 'ri-equalizer-2-line', roles: ADMIN },
    ],
  },
];

const isVisible = (roles: NavItem['roles'], role: AppRole | null) =>
  roles === 'all' ? true : role ? roles.includes(role) : false;

/** Groups filtered for the signed-in role; empty groups disappear entirely. */
export function visibleGroups(role: AppRole | null): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isVisible(item.roles, role)),
  })).filter((group) => group.items.length > 0);
}

/** Bottom bar on mobile — first five reachable destinations, no duplicates. */
export function mobileItems(role: AppRole | null): NavItem[] {
  const preferred = ['/app', '/app/portal/teacher', '/app/students', '/app/attendance', '/app/fees', '/app/settings'];
  const flat = visibleGroups(role).flatMap((group) => group.items);
  const picked: NavItem[] = [];
  preferred.forEach((to) => {
    const hit = flat.find((item) => item.to === to);
    if (hit && picked.length < 5) picked.push(hit);
  });
  flat.forEach((item) => {
    if (picked.length < 5 && !picked.some((p) => p.to === item.to)) picked.push(item);
  });
  return picked;
}