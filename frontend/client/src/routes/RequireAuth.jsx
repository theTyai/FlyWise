import { Navigate, useLocation } from 'react-router-dom';
import { PageLoading } from '@shared/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Sends signed-out visitors to the sign-in page and brings them back afterwards.
// This is a convenience only: the server checks the token on every protected request.
export default function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
