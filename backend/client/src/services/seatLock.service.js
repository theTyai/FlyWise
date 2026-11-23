// Seat lock service: 5-minute atomic inventory hold during checkout & payment.
import crypto from 'node:crypto';
import { withTransaction } from '@flywise/shared/db.js';
import { ApiError } from '@flywise/shared/http.js';
import { FlightOffer, SeatInventory, SeatLock, getSettings } from '@flywise/shared/models.js';

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function cleanupExpiredLocks() {
  const expired = await SeatLock.find({
    status: 'LOCKED',
    expiresAt: { $lte: new Date() },
  });

  for (const lock of expired) {
    await withTransaction(async (session) => {
      const opt = session ? { session } : {};
      const updated = await SeatLock.findOneAndUpdate(
        { _id: lock._id, status: 'LOCKED' },
        { $set: { status: 'EXPIRED' } },
        opt,
      );
      if (updated) {
        await SeatInventory.updateOne(
          { flightKey: lock.flightKey },
          { $inc: { availableSeats: lock.seats } },
          opt,
        );
      }
    }).catch(() => {});
  }
}

export async function acquireSeatLock(user, { offerId, seats = 1 }) {
  await cleanupExpiredLocks();

  const offer = await FlightOffer.findById(offerId);
  if (!offer) {
    throw new ApiError(404, 'OFFER_NOT_FOUND', 'This flight offer is no longer available. Please search again.');
  }

  const seatsNeeded = Number(seats) || offer.passengerCount || 1;
  const flightKey = offer.flightKey;

  // Ensure inventory exists
  const settings = await getSettings();
  const defaultSeats = settings?.defaultSimulatedSeats || 12;
  await SeatInventory.updateOne(
    { flightKey },
    {
      $setOnInsert: {
        flightNumber: offer.flightNumber,
        airline: offer.airline,
        origin: offer.origin,
        destination: offer.destination,
        departureTime: offer.departureTime,
        totalSeats: defaultSeats,
        availableSeats: defaultSeats,
        inventoryMode: 'SIMULATED',
      },
    },
    { upsert: true },
  );

  const lockKey = `LOCK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + LOCK_DURATION_MS);

  const lock = await withTransaction(async (session) => {
    const opt = session ? { session } : {};

    const inventory = await SeatInventory.findOneAndUpdate(
      { flightKey, availableSeats: { $gte: seatsNeeded } },
      { $inc: { availableSeats: -seatsNeeded } },
      { new: true, ...opt },
    );

    if (!inventory) {
      const current = await SeatInventory.findOne({ flightKey }, null, opt);
      const remaining = current?.availableSeats ?? 0;
      throw new ApiError(
        409,
        'NO_SEATS_AVAILABLE',
        remaining === 0
          ? `Flight ${offer.flightNumber} is sold out. Please select another flight.`
          : `Only ${remaining} seat(s) available on ${offer.flightNumber}, but ${seatsNeeded} needed.`,
      );
    }

    const [created] = await SeatLock.create(
      [
        {
          lockKey,
          userId: user._id,
          offerId: offer._id,
          flightKey,
          seats: seatsNeeded,
          expiresAt,
          status: 'LOCKED',
        },
      ],
      opt,
    );

    return created;
  });

  return {
    lockKey: lock.lockKey,
    expiresAt: lock.expiresAt,
    seats: lock.seats,
    flightKey: lock.flightKey,
    remainingSeconds: Math.max(0, Math.floor((lock.expiresAt.getTime() - Date.now()) / 1000)),
  };
}

export async function getActiveSeatLock(lockKey, userId) {
  await cleanupExpiredLocks();
  const lock = await SeatLock.findOne({ lockKey, userId });
  if (!lock) {
    throw new ApiError(404, 'LOCK_NOT_FOUND', 'Checkout session not found.');
  }
  if (lock.status !== 'LOCKED' || lock.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(410, 'LOCK_EXPIRED', 'Your seat hold has expired. Please select your flight again.');
  }
  return {
    lockKey: lock.lockKey,
    offerId: lock.offerId,
    flightKey: lock.flightKey,
    seats: lock.seats,
    expiresAt: lock.expiresAt,
    remainingSeconds: Math.max(0, Math.floor((lock.expiresAt.getTime() - Date.now()) / 1000)),
  };
}

export async function releaseSeatLock(lockKey, userId) {
  const lock = await SeatLock.findOne({ lockKey, userId, status: 'LOCKED' });
  if (!lock) return { released: false };

  await withTransaction(async (session) => {
    const opt = session ? { session } : {};
    await SeatLock.updateOne({ _id: lock._id }, { $set: { status: 'RELEASED' } }, opt);
    await SeatInventory.updateOne(
      { flightKey: lock.flightKey },
      { $inc: { availableSeats: lock.seats } },
      opt,
    );
  });

  return { released: true };
}
