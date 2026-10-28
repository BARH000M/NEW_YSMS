import type { RouteObject } from 'react-router-dom';
import NotFound from '@/pages/NotFound';
import Home from '@/pages/home/page';
import Admission from '@/pages/admission/page';
import Complain from '@/pages/complain/page';
import Contact from '@/pages/contact/page';
import System from '@/pages/system/page';
import LoginPage from '@/pages/login/page';
import DashboardPage from '@/pages/app/dashboard/page';
import StudentsPage from '@/pages/app/students/page';
import AdmissionsPage from '@/pages/app/admissions/page';
import FrontOfficePage from '@/pages/app/front-office/page';
import StaffPage from '@/pages/app/staff/page';
import AcademicsPage from '@/pages/app/academics/page';
import CalendarPage from '@/pages/app/calendar/page';
import SettingsPage from '@/pages/app/settings/page';
import FeesPage from '@/pages/app/fees/page';
import ExamsPage from '@/pages/app/exams/page';
import MarksEntryPage from '@/pages/app/exams/marks/page';
import AttendancePage from '@/pages/app/attendance/page';
import ReportsPage from '@/pages/app/reports/page';
import OutstandingPage from '@/pages/app/fees/outstanding/page';
import RolesPage from '@/pages/app/roles/page';
import AccountLinksPage from '@/pages/app/account-links/page';
import TeacherPortalPage from '@/pages/app/portal/teacher/page';
import StudentPortalPage from '@/pages/app/portal/student/page';
import CallsPage from '@/pages/app/front-office/calls/page';
import MailPage from '@/pages/app/front-office/mail/page';
import FeeSetupPage from '@/pages/app/fees/setup/page';
import FeeDiscountsPage from '@/pages/app/fees/discounts/page';
import PromoteStudentsPage from '@/pages/app/students/promote/page';
import LedgerPage from '@/pages/app/fees/ledger/page';
import ExpensesPage from '@/pages/app/finance/expenses/page';
import PayrollPage from '@/pages/app/staff/payroll/page';
import AttendanceByDatePage from '@/pages/app/attendance/by-date/page';
import EvaluationPage from '@/pages/app/reports/evaluation/page';
import CollectionLoadPage from '@/pages/app/reports/collection/page';
import AssignmentsPage from '@/pages/app/lms/assignments/page';
import CoursesPage from '@/pages/app/lms/courses/page';
import RequireAuth from '@/components/app/RequireAuth';

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/system',
    element: <System />,
  },
  {
    path: '/admission',
    element: <Admission />,
  },
  {
    path: '/complain',
    element: <Complain />,
  },
  {
    path: '/contact',
    element: <Contact />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
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
    path: '/app/students/promote',
    element: (
      <RequireAuth>
        <PromoteStudentsPage />
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
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;