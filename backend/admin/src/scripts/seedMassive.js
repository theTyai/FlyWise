// Massive seed script: populates 50 travellers, 250+ flights, and 1,200+ realistic bookings.
//
//   npm run seed:massive
//
process.env.FLYWISE_SEEDING = 'true';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AIRPORTS, BOOKING_STATUS as S, NOTIFICATION_TYPE as N } from '@flywise/shared/constants.js';
import { connectDB, mongoose } from '@flywise/shared/db.js';
import {
  Admin, AuditLog, BookingRequest, Notification, SeatAllocation, SeatInventory, Ticket, User,
} from '@flywise/shared/models.js';
import { istDay } from '@flywise/shared/time.js';
import { config } from '../config/index.js';
import { ensureAdmin } from './seedAdmin.js';

export const DEMO_PASSWORD = 'Traveller@123';
const DAY_MS = 86400000;

const FIRST_NAMES = [
  'Aarav', 'Aryan', 'Advait', 'Rohan', 'Kabir', 'Vikram', 'Aditya', 'Reyansh', 'Ishaan', 'Dhruv',
  'Ananya', 'Diya', 'Isha', 'Mira', 'Riya', 'Saanvi', 'Aditi', 'Kavya', 'Pooja', 'Tanvi',
  'Rahul', 'Priya', 'Amit', 'Neha', 'Sanjay', 'Sunita', 'Rajesh', 'Deepa', 'Karan', 'Shreya',
  'Alok', 'Sneha', 'Manish', 'Meera', 'Gaurav', 'Swati', 'Nikhil', 'Simran', 'Varun', 'Pallavi',
  'Sameer', 'Rashmi', 'Vivek', 'Shruti', 'Abhishek', 'Divya', 'Kunal', 'Preeti', 'Suresh', 'Monika',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Patel', 'Singh', 'Kumar', 'Iyer', 'Nair', 'Reddy', 'Chauhan',
  'Joshi', 'Mehta', 'Bhat', 'Deshmukh', 'Kulkarni', 'Banerjee', 'Chatterjee', 'Sen', 'Ghosh', 'Rao',
  'Agarwal', 'Mishra', 'Pandey', 'Saxena', 'Kapoor', 'Malhotra', 'Bose', 'Dutta', 'Menon', 'Pillai',
];

const AIRLINES = [
  { name: 'IndiGo', code: '6E', prefix: '6E' },
  { name: 'Air India', code: 'AI', prefix: 'AI' },
  { name: 'Vistara', code: 'UK', prefix: 'UK' },
  { name: 'Akasa Air', code: 'QP', prefix: 'QP' },
  { name: 'SpiceJet', code: 'SG', prefix: 'SG' },
  { name: 'Air India Express', code: 'IX', prefix: 'IX' },
];

const CITIES = ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Goa', 'Jaipur'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePNR() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let pnr = '';
  for (let i = 0; i < 6; i++) pnr += chars[Math.floor(Math.random() * chars.length)];
  return pnr;
}

async function seedMassive() {
  console.log('[seed:massive] Connecting to database...');
  await connectDB(config.mongoUri);
  await ensureAdmin();

  const admin = await Admin.findOne({});
  if (!admin) throw new Error('Desk admin account missing.');

  console.log('[seed:massive] Generating 50 traveller accounts...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = [];

  for (let i = 0; i < 50; i++) {
    const fn = FIRST_NAMES[i];
    const ln = LAST_NAMES[i % LAST_NAMES.length];
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i ? i : ''}@demo.flywise`;
    const gender = i % 2 === 0 ? 'MALE' : 'FEMALE';
    const birthYear = randomInt(1985, 2003);
    const birthMonth = String(randomInt(1, 12)).padStart(2, '0');
    const birthDay = String(randomInt(1, 28)).padStart(2, '0');

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: `${fn} ${ln}`,
        email,
        phone: `9${randomInt(100000000, 999999999)}`,
        gender,
        dateOfBirth: `${birthYear}-${birthMonth}-${birthDay}`,
        nationality: 'Indian',
        idType: 'AADHAAR',
        address: {
          line1: `${randomInt(10, 999)}, MG Road`,
          city: randomItem(CITIES),
          state: 'Maharashtra',
          pincode: `${randomInt(400001, 400099)}`,
        },
        profileComplete: true,
        passwordHash,
        role: 'USER',
        accountStatus: 'ACTIVE',
      });
    }
    users.push(user);
  }

  console.log('[seed:massive] Generating 250+ authentic flights across Indian routes...');
  const airportCodes = AIRPORTS.map((a) => a.code);
  const flightDocs = [];
  const inventories = [];

  // Generate flights over the next 30 days
  for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
    const dateStr = istDay(Date.now() + dayOffset * DAY_MS);

    for (let r = 0; r < 9; r++) {
      const origin = airportCodes[r % airportCodes.length];
      let dest = airportCodes[(r + 3) % airportCodes.length];
      if (origin === dest) dest = airportCodes[(r + 5) % airportCodes.length];

      const airline = randomItem(AIRLINES);
      const flightNumber = `${airline.prefix}-${randomInt(100, 9999)}`;
      const flightKey = `${flightNumber}_${dateStr}`;
      const hour = randomInt(5, 22);
      const min = randomItem(['00', '15', '30', '45']);
      const departureTime = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${min}:00+05:30`);
      const durationMinutes = randomInt(70, 180);
      const arrivalTime = new Date(departureTime.getTime() + durationMinutes * 60000);
      const fare = randomInt(3200, 11500);
      const totalSeats = randomInt(25, 60);

      inventories.push({
        flightKey,
        flightNumber,
        airline: airline.name,
        origin,
        destination: dest,
        departureTime,
        totalSeats,
        availableSeats: totalSeats,
        inventoryMode: 'SIMULATED',
      });

      flightDocs.push({
        flightKey,
        flightNumber,
        airline: airline.name,
        airlineCode: airline.code,
        origin,
        destination: dest,
        departureTime,
        arrivalTime,
        durationMinutes,
        stops: randomInt(0, 1),
        cabinClass: 'ECONOMY',
        baggage: { cabin: '7 kg', checked: '15 kg' },
        currency: 'INR',
        pricePerPassenger: fare,
        passengerCount: 1,
        price: fare,
        totalSeats,
        availableSeats: totalSeats,
      });
    }
  }

  // Bulk upsert inventory
  console.log(`[seed:massive] Upserting ${inventories.length} seat inventory records...`);
  for (const inv of inventories) {
    await SeatInventory.updateOne(
      { flightKey: inv.flightKey },
      { $setOnInsert: inv },
      { upsert: true },
    );
  }

  const existingCount = await BookingRequest.countDocuments();
  if (existingCount >= 1000) {
    console.log(`[seed:massive] Database already contains ${existingCount} bookings. Skipping bulk request generation.`);
    return;
  }

  console.log('[seed:massive] Creating 1,200+ bookings, allocations, tickets, and notifications...');
  const targetTotal = 1250;
  const bookingsToCreate = [];
  const ticketsToCreate = [];
  const allocationsToCreate = [];
  const notificationsToCreate = [];
  const auditLogsToCreate = [];
  const inventoryDecrements = new Map();

  let refCounter = existingCount + 1;

  for (let b = 0; b < targetTotal; b++) {
    const user = randomItem(users);
    const flight = randomItem(flightDocs);
    const daysAgo = randomInt(0, 25);
    const createdAt = new Date(Date.now() - daysAgo * DAY_MS - randomInt(60000, 36000000));
    const bookingRef = `FWB-2026-${String(refCounter++).padStart(5, '0')}`;

    // Status distribution: 65% CONFIRMED, 15% CANCELLED, 10% REJECTED, 5% REVOKED, 5% PENDING
    const roll = Math.random();
    let status = S.CONFIRMED;
    if (roll < 0.65) status = S.CONFIRMED;
    else if (roll < 0.80) status = S.CANCELLED;
    else if (roll < 0.90) status = S.REJECTED;
    else if (roll < 0.95) status = S.REVOKED;
    else status = S.PENDING_ADMIN_APPROVAL;

    const [first, ...rest] = user.name.split(' ');
    const passengers = [
      {
        firstName: first,
        lastName: rest.join(' ') || 'Kumar',
        gender: user.gender || 'OTHER',
        dateOfBirth: user.dateOfBirth || '1998-05-15',
      },
    ];

    const bookingId = new mongoose.Types.ObjectId();
    const history = [{ status: S.ALLOCATION_IN_PROGRESS, actor: 'SYSTEM', note: 'Verifying seat availability', at: createdAt }];

    let adminDecision = null;
    if (status === S.CONFIRMED) {
      history.push({ status: S.CONFIRMED, actor: 'SYSTEM', note: 'Instant ACID seat allocation confirmed', at: new Date(createdAt.getTime() + 2000) });
      adminDecision = { action: 'CONFIRM', reason: 'Instant automated seat verification & allocation', decidedAt: createdAt, adminName: 'Automated Seat Allocation Engine' };
    } else if (status === S.CANCELLED) {
      history.push({ status: S.CONFIRMED, actor: 'SYSTEM', note: 'Booking confirmed', at: new Date(createdAt.getTime() + 2000) });
      history.push({ status: S.CANCELLED, actor: 'USER', note: 'Trip cancelled by traveller', at: new Date(createdAt.getTime() + 86400000) });
    } else if (status === S.REJECTED) {
      history.push({ status: S.REJECTED, actor: 'ADMIN', note: 'Fare expired on airline GDS', at: new Date(createdAt.getTime() + 60000) });
      adminDecision = { action: 'REJECT', reason: 'Fare expired on airline GDS', decidedAt: createdAt, adminName: admin.name, adminId: admin._id };
    } else if (status === S.REVOKED) {
      history.push({ status: S.CONFIRMED, actor: 'SYSTEM', note: 'Booking confirmed', at: new Date(createdAt.getTime() + 2000) });
      history.push({ status: S.REVOKED, actor: 'ADMIN', note: 'Flight cancelled by carrier', at: new Date(createdAt.getTime() + 43200000) });
      adminDecision = { action: 'REVOKE', reason: 'Flight cancelled by carrier', decidedAt: createdAt, adminName: admin.name, adminId: admin._id };
    }

    const bookingDoc = {
      _id: bookingId,
      bookingReference: bookingRef,
      userId: user._id,
      flight: {
        ...flight,
      },
      passengers,
      contact: { email: user.email, phone: user.phone },
      pricing: {
        amount: flight.price,
        currency: flight.currency,
        perPassenger: flight.pricePerPassenger,
        passengerCount: 1,
      },
      status,
      adminDecision,
      history,
      createdAt,
      updatedAt: createdAt,
    };
    bookingsToCreate.push(bookingDoc);

    // If confirmed, allocate seat and issue ticket
    if (status === S.CONFIRMED) {
      inventoryDecrements.set(flight.flightKey, (inventoryDecrements.get(flight.flightKey) || 0) + 1);

      allocationsToCreate.push({
        bookingId,
        flightKey: flight.flightKey,
        seats: 1,
        status: 'ACTIVE',
        createdAt,
      });

      const pnr = generatePNR();
      const ticketNumber = `FWT-2026-${String(refCounter + 1000).padStart(5, '0')}`;
      const seatLetter = randomItem(['A', 'B', 'C', 'D', 'E', 'F']);
      const seatRow = randomInt(5, 28);
      const seatNumber = `${seatRow}${seatLetter}`;

      ticketsToCreate.push({
        bookingId,
        ticketNumber,
        pnr,
        flight: {
          airline: flight.airline,
          airlineCode: flight.airlineCode,
          flightNumber: flight.flightNumber,
          origin: flight.origin,
          destination: flight.destination,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          terminal: 'T3',
          gate: `G${randomInt(10, 28)}`,
          cabinClass: flight.cabinClass,
        },
        passengers: [
          {
            name: user.name,
            gender: user.gender,
            dateOfBirth: user.dateOfBirth,
            seatNumber,
            boardingGroup: 'Zone 1',
          },
        ],
        totalFare: { amount: flight.price, currency: flight.currency },
        paymentReference: `TXN-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        qrData: JSON.stringify({ pnr, ticketNumber, flight: flight.flightNumber, seat: seatNumber, passenger: user.name }),
        status: 'CONFIRMED',
        issuedAt: createdAt,
      });

      notificationsToCreate.push({
        userId: user._id,
        bookingId,
        bookingReference: bookingRef,
        type: N.BOOKING_CONFIRMED,
        title: 'Booking & Ticket Confirmed',
        message: `${bookingRef}: Confirmed on ${flight.airline} ${flight.flightNumber}. PNR: ${pnr}, Seat: ${seatNumber}.`,
        read: daysAgo > 3,
        createdAt,
      });
    }

    if (adminDecision && (status === S.REJECTED || status === S.REVOKED)) {
      auditLogsToCreate.push({
        adminId: admin._id,
        adminName: admin.name,
        action: status === S.REJECTED ? 'REJECT_BOOKING' : 'REVOKE_BOOKING',
        targetType: 'BOOKING_REQUEST',
        targetId: bookingId,
        details: { bookingReference: bookingRef, reason: adminDecision.reason },
        createdAt,
      });
    }
  }

  console.log(`[seed:massive] Inserting ${bookingsToCreate.length} bookings...`);
  await BookingRequest.insertMany(bookingsToCreate, { ordered: false });

  console.log(`[seed:massive] Inserting ${ticketsToCreate.length} e-tickets...`);
  await Ticket.insertMany(ticketsToCreate, { ordered: false });

  console.log(`[seed:massive] Inserting ${allocationsToCreate.length} seat allocations...`);
  await SeatAllocation.insertMany(allocationsToCreate, { ordered: false });

  console.log(`[seed:massive] Inserting ${notificationsToCreate.length} notifications...`);
  await Notification.insertMany(notificationsToCreate, { ordered: false });

  if (auditLogsToCreate.length) {
    console.log(`[seed:massive] Inserting ${auditLogsToCreate.length} audit logs...`);
    await AuditLog.insertMany(auditLogsToCreate, { ordered: false });
  }

  // Update seat inventory remaining counts
  console.log('[seed:massive] Depleting allocated seats in SeatInventory...');
  for (const [flightKey, count] of inventoryDecrements.entries()) {
    await SeatInventory.updateOne(
      { flightKey },
      { $inc: { availableSeats: -count } },
    );
  }

  console.log('\n======================================================');
  console.log('[seed:massive] SUCCESS! Generated full-scale dataset:');
  console.log(`  Travellers:     ${users.length} accounts (Password: ${DEMO_PASSWORD})`);
  console.log(`  Flights:        ${flightDocs.length} schedules across Indian corridors`);
  console.log(`  Bookings:       ${bookingsToCreate.length} total records`);
  console.log(`  E-Tickets:      ${ticketsToCreate.length} issued with live PNRs & seats`);
  console.log(`  Notifications:  ${notificationsToCreate.length} generated`);
  console.log(`  Desk Login:     ${admin.email}`);
  console.log('======================================================\n');
}

seedMassive()
  .catch((err) => {
    console.error('[seed:massive] Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
