// Every page of the desk app and the URL it lives at.
import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import AuditLog from '../pages/AuditLog.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Inventory from '../pages/Inventory.jsx';
import Login from '../pages/Login.jsx';
import RequestDetail from '../pages/RequestDetail.jsx';
import Requests from '../pages/Requests.jsx';
import SettingsPage from '../pages/Settings.jsx';
import Travellers from '../pages/Travellers.jsx';
import RequireAdmin from './RequireAdmin.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Everything inside the sidebar shell needs a signed-in admin */}
      <Route element={<RequireAdmin><Shell /></RequireAdmin>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/requests/:id" element={<RequestDetail />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/travellers" element={<Travellers />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
