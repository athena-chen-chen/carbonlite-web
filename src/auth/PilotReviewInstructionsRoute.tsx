import { useAuth } from './AuthProvider';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';
import { isPilotReviewer } from '../services/auth';

export function PilotReviewInstructionsRoute({ children }: { children: React.ReactNode }) {
  const { isPlatformAdmin, user } = useAuth();

  if (!isPlatformAdmin && !isPilotReviewer(user)) {
    return <AccessDeniedPage />;
  }

  return children;
}
