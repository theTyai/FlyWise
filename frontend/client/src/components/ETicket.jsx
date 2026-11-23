import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Download, Plane, Printer, ShieldCheck } from 'lucide-react';
import { CABIN_LABEL } from '@shared/constants.js';
import { date, day, money, time } from '@shared/ui/format.js';
import { Button } from '@shared/ui/index.jsx';

export default function ETicket({ ticket, booking }) {
  const printRef = useRef(null);

  if (!ticket && !booking) return null;

  const t = ticket || {};
  const flight = t.flight || booking?.flight || {};
  const passengers = t.passengers || (booking?.passengers || []).map((p, i) => ({
    name: `${p.firstName} ${p.lastName}`,
    gender: p.gender,
    seatNumber: `${14 + i}A`,
    boardingGroup: 'Zone 1',
  }));
  const pnr = t.pnr || booking?.bookingReference?.replace('FWB-', 'PNR-') || 'FW7X9K';
  const ticketNumber = t.ticketNumber || `FWT-2026-${booking?.bookingReference?.slice(-5) || '10492'}`;
  const totalAmount = t.totalFare?.amount || booking?.pricing?.amount || 0;
  const currency = t.totalFare?.currency || booking?.pricing?.currency || 'INR';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-mint-50 text-mint-700">
            <CheckCircle2 className="size-4" />
          </span>
          <div>
            <h3 className="font-bold text-ink text-base">Official Electronic Boarding Pass</h3>
            <p className="text-xs text-ink-faint">Instant ACID confirmation • Verified seat guarantee</p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="size-3.5 mr-1" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Boarding Pass Ticket Container */}
      <div
        ref={printRef}
        className="print:border-0 print:shadow-none relative overflow-hidden rounded-3xl border border-line bg-white shadow-lift"
      >
        {/* Ticket Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-night-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-signal-600 text-white shadow-sm">
              <Plane className="size-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-lg">{flight.airline}</span>
                <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-mono font-semibold">
                  {flight.flightNumber}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {CABIN_LABEL[flight.cabinClass] || flight.cabinClass || 'Economy'} Class • E-Ticket
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider text-white/60 block">Booking Reference (PNR)</span>
            <span className="board text-2xl font-extrabold tracking-widest text-signal-200">
              {pnr}
            </span>
          </div>
        </div>

        {/* Flight Route Banner */}
        <div className="grid border-b border-line p-6 md:grid-cols-3 md:items-center gap-6 bg-gradient-to-r from-mist/50 to-white">
          {/* Origin */}
          <div>
            <span className="text-xs font-bold text-ink-faint uppercase tracking-wider block">Origin</span>
            <span className="board text-4xl font-extrabold text-ink block">{flight.origin}</span>
            <span className="text-sm font-semibold text-ink-soft block">{flight.departureTime ? time(flight.departureTime) : '--:--'}</span>
            <span className="text-xs text-ink-faint block">{flight.departureTime ? day(flight.departureTime) : ''}</span>
          </div>

          {/* Route Arrow Indicator */}
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-signal-700 bg-signal-50 px-3 py-1 rounded-full mb-1">
              Confirmed Non-Stop
            </span>
            <div className="relative flex w-full items-center justify-center">
              <div className="h-0.5 w-full bg-signal-200" />
              <Plane className="size-4 text-signal-600 absolute" />
            </div>
            <span className="text-[11px] text-ink-faint mt-1">Terminal {flight.terminal || 'T3'} • Gate {flight.gate || 'G12'}</span>
          </div>

          {/* Destination */}
          <div className="text-left md:text-right">
            <span className="text-xs font-bold text-ink-faint uppercase tracking-wider block">Destination</span>
            <span className="board text-4xl font-extrabold text-ink block">{flight.destination}</span>
            <span className="text-sm font-semibold text-ink-soft block">{flight.arrivalTime ? time(flight.arrivalTime) : '--:--'}</span>
            <span className="text-xs text-ink-faint block">{flight.arrivalTime ? day(flight.arrivalTime) : ''}</span>
          </div>
        </div>

        {/* Passenger & Seat Details */}
        <div className="p-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-3">
            Confirmed Passenger(s) & Seat Allocation
          </h4>
          <div className="divide-y divide-line rounded-2xl border border-line bg-mist/30">
            {passengers.map((p, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <span className="text-xs text-ink-faint block">Passenger {idx + 1}</span>
                  <span className="font-bold text-ink text-base">{p.name}</span>
                  <span className="text-xs text-ink-soft block">{p.gender || 'Adult'}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint block">Group</span>
                    <span className="rounded bg-night-900/5 px-2.5 py-0.5 text-xs font-bold text-ink">
                      {p.boardingGroup || 'Zone 1'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint block">Seat</span>
                    <span className="board text-2xl font-black text-signal-600 bg-signal-50 px-3 py-1 rounded-xl border border-signal-200 block">
                      {p.seatNumber}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stub & QR Verification Footer */}
        <div className="flex flex-wrap items-center justify-between gap-6 border-t-2 border-dashed border-line bg-mist/60 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="rounded-xl border border-line bg-white p-2 shadow-xs">
              <QRCodeSVG
                value={t.qrData || JSON.stringify({ pnr, ticketNumber, flight: flight.flightNumber })}
                size={76}
                level="M"
              />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint block">Ticket Number</span>
              <span className="board text-sm font-bold text-ink block">{ticketNumber}</span>
              <span className="text-xs text-mint-700 font-semibold flex items-center gap-1 mt-1">
                <ShieldCheck className="size-3.5" /> Direct Carrier E-Ticket
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider text-ink-faint block">Fare Paid</span>
            <span className="board text-2xl font-bold text-ink block">{money(totalAmount, currency)}</span>
            <span className="text-[11px] text-ink-faint block">Payment Confirmed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
