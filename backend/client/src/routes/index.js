// The public API surface of the user backend, mounted at /api/v1.
import { Router } from 'express';
import { limiter } from '../middleware/rateLimit.js';
import authRoutes from './auth.routes.js';
import bookingRoutes from './booking.routes.js';
import flightRoutes from './flight.routes.js';
import notificationRoutes from './notification.routes.js';
import userRoutes from './user.routes.js';

const api = Router();

// Sign-in endpoints get a much tighter limit to slow down password guessing.
api.use('/auth', limiter(40, 'Too many sign-in attempts. Wait a few minutes and try again.'), authRoutes);
api.use(limiter(600, 'Too many requests. Slow down and try again shortly.'));
api.use('/users', userRoutes);
api.use('/flights', flightRoutes);
api.use('/bookings', bookingRoutes);
api.use('/notifications', notificationRoutes);

export default api;
