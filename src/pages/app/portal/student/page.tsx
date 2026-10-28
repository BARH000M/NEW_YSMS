import { useAuth } from '@/hooks/useAuth';
import { LoadingBlock } from '@/components/app/ui';
import SelfStudentPortal from '../components/SelfStudentPortal';
import StaffStudentPortal from '../components/StaffStudentPortal';

/**
 * Route gate for the student portal.
 * A student or parent account can only ever be served the server-resolved
 * bundle for its own record(s) — the picker and the staff table are never
 * mounted for them, and no student id is ever sent from the browser.
 */
export default function StudentPortalPage() {
  const { role, loading } = useAuth();

  if (loading) return <LoadingBlock />;
  if (role === 'student' || role === 'parent') return <SelfStudentPortal />;
  return <StaffStudentPortal />;
}