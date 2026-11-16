// The desk API, mounted at /api/v1/admin.
import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { limiter } from '../middleware/rateLimit.js';
import auditRoutes from './audit.routes.js';
import authRoutes from './auth.routes.js';
import bookingRoutes from './booking.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import inventoryRoutes from './inventory.routes.js';
import settingsRoutes from './settings.routes.js';
import userRoutes from './user.routes.js';

const api = Router();

api.use('/auth', limiter(30, 'Too many sign-in attempts. Wait a few minutes and try again.'), authRoutes);

// Everything below needs a valid admin token, checked on the server for every request.
api.use(requireAdmin);
api.use('/dashboard', dashboardRoutes);
api.use('/bookings', bookingRoutes);
api.use('/inventory', inventoryRoutes);
api.use('/users', userRoutes);
api.use('/audit-logs', auditRoutes);
api.use('/settings', settingsRoutes);

export default api;
