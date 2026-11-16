// MongoDB schemas (database: flywise_db), one file per area.
//
// Both backends read and write the same collections, so the schemas live here as a
// shared data contract. Business rules (who may change what, and when) live in each
// backend's services, not in these files.
//
// Import from '@flywise/shared/models.js':
//   import { BookingRequest, SeatInventory } from '@flywise/shared/models.js';
export { User } from './user.model.js';
export { Admin } from './admin.model.js';
export { Search, FlightOffer, flightFields } from './flight.model.js';
export { BookingRequest } from './booking.model.js';
export { SeatInventory, SeatAllocation } from './inventory.model.js';
export { Notification } from './notification.model.js';
export { AuditLog } from './audit.model.js';
export { Setting, Counter, getSettings, nextBookingReference } from './setting.model.js';
