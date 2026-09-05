import { useAuth } from './AuthProvider';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';
import { isPilotReviewer } from '../services/auth';

export function PilotReviewInstructionsRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, user } = useAuth();

  if (!isAdmin && !isPilotReviewer(user)) {
    return <AccessDeniedPage />;
  }

  return children;
}
