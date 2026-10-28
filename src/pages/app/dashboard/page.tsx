import { useAuth } from '@/hooks/useAuth';
import { LoadingBlock } from '@/components/app/ui';
import SelfDashboard from './components/SelfDashboard';
import StaffDashboard from './components/StaffDashboard';

/**
 * The dashboard renders a different home per role: a student or parent never
 * mounts the staff panels (which they cannot read anyway) and instead lands on
 * their own scoped summary plus their own quick links.
 */
export default function DashboardPage() {
  const { role, loading } = useAuth();

  if (loading) return <LoadingBlock />;
  if (role === 'student' || role === 'parent') return <SelfDashboard role={role} />;
  return <StaffDashboard role={role} />;
}