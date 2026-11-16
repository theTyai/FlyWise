// Every page of the traveller app and the URL it lives at.
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Login, Register } from '../pages/Auth.jsx';
import BookingDetail from '../pages/BookingDetail.jsx';
import BookingNew from '../pages/BookingNew.jsx';
import Landing from '../pages/Landing.jsx';
import MyBookings from '../pages/MyBookings.jsx';
import Notifications from '../pages/Notifications.jsx';
import Profile from '../pages/Profile.jsx';
import Results from '../pages/Results.jsx';
import RequireAuth from './RequireAuth.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Open to everyone */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/results/:searchId" element={<Results />} />

        {/* Signed-in travellers only */}
        <Route path="/book/:offerId" element={<RequireAuth><BookingNew /></RequireAuth>} />
        <Route path="/trips" element={<RequireAuth><MyBookings /></RequireAuth>} />
        <Route path="/trips/:id" element={<RequireAuth><BookingDetail /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
