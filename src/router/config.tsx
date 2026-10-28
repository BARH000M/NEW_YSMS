import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import RequireAuth from '@/components/app/RequireAuth';

/**
 * Every screen is loaded on demand. The landing page used to ship the whole
 * admin console (fees, exams, reports, charts) in one bundle; now the first
 * paint only pays for the page actually being looked at.
 */
const Home = lazy(() => import('@/pages/home/page'));
const System = lazy(() => import('@/pages/system/page'));
const Admission = lazy(() => import('@/pages/admission/page'));
const Complain = lazy(() => import('@/pages/complain/page'));
const Contact = lazy(() => import('@/pages/contact/page'));
const LoginPage = lazy(() => import('@/pages/login/page'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const DashboardPage = lazy(() => import('@/pages/app/dashboard/page'));
const StudentsPage = lazy(() => import('@/pages/app/students/page'));
const StudentCategoriesPage = lazy(() => import('@/pages/app/students/categories/page'));
const PromoteStudentsPage = lazy(() => import('@/pages/app/students/promote/page'));
const AdmissionsPage = lazy(() => import('@/pages/app/admissions/page'));
const FrontOfficePage = lazy(() => import('@/pages/app/front-office/page'));
const CallsPage = lazy(() => import('@/pages/app/front-office/calls/page'));
const MailPage = lazy(() => import('@/pages/app/front-office/mail/page'));
const StaffPage = lazy(() => import('@/pages/app/staff/page'));
const PayrollPage = lazy(() => import('@/pages/app/staff/payroll/page'));
const AcademicsPage = lazy(() => import('@/pages/app/academics/page'));
const CalendarPage = lazy(() => import('@/pages/app/calendar/page'));
const SettingsPage = lazy(() => import('@/pages/app/settings/page'));
const TeacherPortalPage = lazy(() => import('@/pages/app/portal/teacher/page'));
const StudentPortalPage = lazy(() => import('@/pages/app/portal/student/page'));

const FeesPage = lazy(() => import('@/pages/app/fees/page'));
const OutstandingPage = lazy(() => import('@/pages/app/fees/outstanding/page'));
const FeeSetupPage = lazy(() => import('@/pages/app/fees/setup/page'));
const FeeDiscountsPage = lazy(() => import('@/pages/app/fees/discounts/page'));
const LedgerPage = lazy(() => import('@/pages/app/fees/ledger/page'));
const ExpensesPage = lazy(() => import('@/pages/app/finance/expenses/page'));
const OtherIncomePage = lazy(() => import('@/pages/app/finance/income/page'));

const AttendancePage = lazy(() => import('@/pages/app/attendance/page'));
const AttendanceByDatePage = lazy(() => import('@/pages/app/attendance/by-date/page'));
const ExamsPage = lazy(() => import('@/pages/app/exams/page'));
const MarksEntryPage = lazy(() => import('@/pages/app/exams/marks/page'));

const ReportsPage = lazy(() => import('@/pages/app/reports/page'));
const EvaluationPage = lazy(() => import('@/pages/app/reports/evaluation/page'));
const CollectionLoadPage = lazy(() => import('@/pages/app/reports/collection/page'));
const FeeStatementReportPage = lazy(() => import('@/pages/app/reports/fee-statement/page'));
const BalanceFeesReportPage = lazy(() => import('@/pages/app/reports/balance-fees/page'));
const TransactionReportPage = lazy(() => import('@/pages/app/reports/transactions/page'));
const MonthlyAttendanceReportPage = lazy(() => import('@/pages/app/reports/attendance-monthly/page'));
const ExamMarksReportPage = lazy(() => import('@/pages/app/reports/exam-marks/page'));
const FinanceChartPage = lazy(() => import('@/pages/app/reports/finance-chart/page'));

const AssignmentsPage = lazy(() => import('@/pages/app/lms/assignments/page'));
const CoursesPage = lazy(() => import('@/pages/app/lms/courses/page'));
const LibraryPage = lazy(() => import('@/pages/app/library/page'));
const DownloadCenterPage = lazy(() => import('@/pages/app/downloads/page'));
const MessagesPage = lazy(() => import('@/pages/app/messages/page'));
const NoticesPage = lazy(() => import('@/pages/app/notices/page'));
const TransportPage = lazy(() => import('@/pages/app/transport/page'));
const HostelPage = lazy(() => import('@/pages/app/hostel/page'));

const RolesPage = lazy(() => import('@/pages/app/roles/page'));
const AccountLinksPage = lazy(() => import('@/pages/app/account-links/page'));
const DatabaseHealthPage = lazy(() => import('@/pages/app/database-health/page'));

const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
  { path: '/system', element: <System /> },
  { path: '/admission', element: <Admission /> },
  { path: '/complain', element: <Complain /> },
  { path: '/contact', element: <Contact /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <DashboardPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/students',
    element: (
      <RequireAuth>
        <StudentsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/students/categories',
    element: (
      <RequireAuth>
        <StudentCategoriesPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/students/promote',
    element: (
      <RequireAuth>
        <PromoteStudentsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/admissions',
    element: (
      <RequireAuth>
        <AdmissionsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/front-office',
    element: (
      <RequireAuth>
        <FrontOfficePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/front-office/visitors',
    element: (
      <RequireAuth>
        <FrontOfficePage key="visitors" initialTab="visitors" />
      </RequireAuth>
    ),
  },
  {
    path: '/app/front-office/enquiries',
    element: (
      <RequireAuth>
        <FrontOfficePage key="enquiries" initialTab="enquiries" />
      </RequireAuth>
    ),
  },
  {
    path: '/app/front-office/complaints',
    element: (
      <RequireAuth>
        <FrontOfficePage key="complaints" initialTab="complaints" />
      </RequireAuth>
    ),
  },
  {
    path: '/app/front-office/calls',
    element: (
      <RequireAuth>
        <CallsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/front-office/mail/incoming',
    element: (
      <RequireAuth>
        <MailPage direction="incoming" />
      </RequireAuth>
    ),
  },
  {
    path: '/app/front-office/mail/outgoing',
    element: (
      <RequireAuth>
        <MailPage direction="outgoing" />
      </RequireAuth>
    ),
  },
  {
    path: '/app/portal/teacher',
    element: (
      <RequireAuth>
        <TeacherPortalPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/portal/student',
    element: (
      <RequireAuth>
        <StudentPortalPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/fees',
    element: (
      <RequireAuth>
        <FeesPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/fees/outstanding',
    element: (
      <RequireAuth>
        <OutstandingPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/fees/setup',
    element: (
      <RequireAuth>
        <FeeSetupPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/fees/discounts',
    element: (
      <RequireAuth>
        <FeeDiscountsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/fees/ledger',
    element: (
      <RequireAuth>
        <LedgerPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/finance/expenses',
    element: (
      <RequireAuth>
        <ExpensesPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/finance/income',
    element: (
      <RequireAuth>
        <OtherIncomePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/attendance',
    element: (
      <RequireAuth>
        <AttendancePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/attendance/by-date',
    element: (
      <RequireAuth>
        <AttendanceByDatePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/exams',
    element: (
      <RequireAuth>
        <ExamsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/exams/marks',
    element: (
      <RequireAuth>
        <MarksEntryPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/reports',
    element: (
      <RequireAuth>
        <ReportsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/reports/evaluation',
    element: (
      <RequireAuth>
        <EvaluationPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/reports/collection',
    element: (
      <RequireAuth>
        <CollectionLoadPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/reports/fee-statement',
    element: (
      <RequireAuth>
        <FeeStatementReportPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/reports/balance-fees',
    element: (
      <RequireAuth>
        <BalanceFeesReportPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/reports/transactions',
    element: (
      <RequireAuth>
        <TransactionReportPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/reports/attendance-monthly',
    element: (
      <RequireAuth>
        <MonthlyAttendanceReportPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/reports/exam-marks',
    element: (
      <RequireAuth>
        <ExamMarksReportPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/reports/finance-chart',
    element: (
      <RequireAuth>
        <FinanceChartPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/lms/assignments',
    element: (
      <RequireAuth>
        <AssignmentsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/lms/courses',
    element: (
      <RequireAuth>
        <CoursesPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/library',
    element: (
      <RequireAuth>
        <LibraryPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/downloads',
    element: (
      <RequireAuth>
        <DownloadCenterPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/messages',
    element: (
      <RequireAuth>
        <MessagesPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/notices',
    element: (
      <RequireAuth>
        <NoticesPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/transport',
    element: (
      <RequireAuth>
        <TransportPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/hostel',
    element: (
      <RequireAuth>
        <HostelPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/roles',
    element: (
      <RequireAuth>
        <RolesPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/account-links',
    element: (
      <RequireAuth>
        <AccountLinksPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/database-health',
    element: (
      <RequireAuth>
        <DatabaseHealthPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/staff',
    element: (
      <RequireAuth>
        <StaffPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/staff/payroll',
    element: (
      <RequireAuth>
        <PayrollPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/academics',
    element: (
      <RequireAuth>
        <AcademicsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/calendar',
    element: (
      <RequireAuth>
        <CalendarPage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/settings',
    element: (
      <RequireAuth>
        <SettingsPage />
      </RequireAuth>
    ),
  },
  { path: '*', element: <NotFound /> },
];

export default routes;