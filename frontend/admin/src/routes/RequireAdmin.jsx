import { Navigate, useLocation } from 'react-router-dom';
import { PageLoading } from '@shared/ui/index.jsx';
import { useDesk } from '../context/DeskContext.jsx';

// Sends signed-out visitors to the desk sign-in page and brings them back afterwards.
// Convenience only: the admin backend checks the token and permission on every request.
export default function RequireAdmin({ children }) {
  const { admin, ready } = useDesk();
  const location = useLocation();
  if (!ready) return <PageLoading label="Opening the desk" />;
  if (!admin) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
