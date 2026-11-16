// Simulated seat inventory: list, add a flight, change a flight's seat total.
import { isValidId } from '@flywise/shared/db.js';
import { ApiError, escapeRegex } from '@flywise/shared/http.js';
import { SeatInventory } from '@flywise/shared/models.js';
import { serializeInventory } from '../utils/serializers.js';
import { writeAudit } from './audit.service.js';

export async function listInventory({ q, skip, limit }) {
  const filter = {};
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ flightKey: pattern }, { airline: pattern }, { origin: pattern }, { destination: pattern }];
  }
  const [items, total] = await Promise.all([
    SeatInventory.find(filter).sort({ departureTime: 1, flightKey: 1 }).skip(skip).limit(limit),
    SeatInventory.countDocuments(filter),
  ]);
  return { inventory: items.map(serializeInventory), total };
}

export async function createInventory(admin, { flightNumber, airline, origin, destination, date, totalSeats }) {
  const flightKey = `${flightNumber}_${date}`;
  if (await SeatInventory.exists({ flightKey })) {
    throw new ApiError(409, 'INVENTORY_EXISTS', `Inventory for ${flightNumber} on ${date} already exists. Edit it instead.`);
  }
  const item = await SeatInventory.create({
    flightKey, flightNumber, airline, origin, destination,
    departureTime: new Date(`${date}T00:00:00+05:30`), totalSeats, availableSeats: totalSeats, inventoryMode: 'SIMULATED',
  });
  await writeAudit(admin, 'INVENTORY_CREATED', null, { meta: { flightKey, totalSeats } });
  return serializeInventory(item);
}

// Changing the total moves "available" by the same amount. The update is conditional, so
// the total can never drop below the seats already allocated, even if a confirmation
// lands between reading the record and writing it.
export async function updateSeatTotal(admin, id, totalSeats) {
  const current = isValidId(id) ? await SeatInventory.findById(id) : null;
  if (!current) throw new ApiError(404, 'INVENTORY_NOT_FOUND', 'Inventory record not found');
  const delta = totalSeats - current.totalSeats;
  const item = await SeatInventory.findOneAndUpdate(
    { _id: current._id, totalSeats: current.totalSeats, availableSeats: { $gte: -delta } },
    { $inc: { totalSeats: delta, availableSeats: delta } },
    { new: true },
  );
  if (!item) {
    const allocated = current.totalSeats - current.availableSeats;
    throw new ApiError(409, 'INVENTORY_CONFLICT', `${allocated} seat(s) are already allocated on this flight, so the total cannot go below ${allocated}. If the numbers just changed, refresh and try again.`);
  }
  await writeAudit(admin, 'INVENTORY_UPDATED', null, { meta: { flightKey: item.flightKey, from: current.totalSeats, to: item.totalSeats } });
  return serializeInventory(item);
}
