import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Armchair, Bell, ClipboardList, LayoutDashboard, LogOut, Menu, Plane, ScrollText, Settings, Users, X,
} from 'lucide-react';
import { cx } from '@shared/ui/index.jsx';
import { useDesk } from '../context/DeskContext.jsx';

export function DeskLogo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="FlyWise Desk overview">
      <span className="grid size-9 place-items-center rounded-xl bg-signal-600 text-white">
        <Plane className="size-[18px] -rotate-45" strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className="text-lg font-bold tracking-tight text-white">FlyWise <span className="font-medium text-white/55">Desk</span></span>
    </Link>
  );
}

const NAV = [
  { to: '/', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/requests', label: 'Booking requests', Icon: ClipboardList, badge: true, permission: 'VIEW_REQUESTS' },
  { to: '/inventory', label: 'Seat inventory', Icon: Armchair, permission: 'MANAGE_INVENTORY' },
  { to: '/travellers', label: 'Travellers', Icon: Users, permission: 'MANAGE_USERS' },
  { to: '/audit', label: 'Audit log', Icon: ScrollText, permission: 'VIEW_AUDIT_LOGS' },
  { to: '/settings', label: 'Settings', Icon: Settings, permission: 'MANAGE_SETTINGS' },
];

// Quick filters under "Booking requests", one per decision the desk makes.
const REQUEST_VIEWS = [
  { status: 'CONFIRMED', label: 'Confirmed' },
  { status: 'REJECTED', label: 'Rejected' },
  { status: 'REVOKED', label: 'Revoked' },
];

function Sidebar({ onNavigate }) {
  const { admin, waiting, can, logout, live } = useDesk();
  const { pathname, search } = useLocation();
  const status = new URLSearchParams(search).get('status');
  const navigate = useNavigate();
  const item = (active) => cx(
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors',
    active ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white',
  );

  return (
    <div className="flex h-full flex-col bg-night-950 px-3 py-5">
      <div className="px-2"><DeskLogo /></div>
      <nav className="mt-8 flex-1 space-y-1" aria-label="Desk">
        {NAV.filter((n) => !n.permission || can(n.permission)).map(({ to, label, Icon, end, badge }) => {
          const onRequests = to === '/requests' && pathname.startsWith('/requests');
          return (
            <div key={to}>
              <NavLink to={to} end={end} onClick={onNavigate}
                className={({ isActive }) => item(isActive && !(onRequests && REQUEST_VIEWS.some((v) => v.status === status)))}>
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {badge && waiting > 0 && (
                  <span className="board rounded-md bg-wait-50 px-1.5 text-sm font-semibold text-wait-700" aria-label={`${waiting} waiting`}>{waiting}</span>
                )}
              </NavLink>
              {to === '/requests' && (
                <div className="mt-1 mb-2 ml-[1.35rem] space-y-0.5 border-l border-white/10 pl-3">
                  {REQUEST_VIEWS.map((v) => {
                    const active = onRequests && status === v.status;
                    return (
                      <Link key={v.status} to={`/requests?status=${v.status}`} onClick={onNavigate} aria-current={active ? 'page' : undefined}
                        className={cx('block rounded-lg px-2.5 py-1.5 text-sm transition-colors', active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white')}>
                        {v.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-white/10 px-2 pt-4">
        <p className={cx('mb-4 flex items-center gap-2 text-[13px]', live ? 'text-mint-50' : 'text-white/50')}>
          <span className={cx('size-2 rounded-full', live ? 'bg-mint-600' : 'bg-white/30')} aria-hidden="true" />
          {live ? 'Live: new requests appear instantly' : 'Live updates reconnecting'}
        </p>
        <p className="truncate text-[15px] font-semibold text-white">{admin.name}</p>
        <p className="truncate text-[13px] text-white/50">{admin.email}</p>
        <button type="button" onClick={() => { logout(); navigate('/login'); }}
          className="mt-3 flex items-center gap-2 rounded-lg py-1 text-sm font-medium text-white/65 hover:text-white">
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useDesk();
  const navigate = useNavigate();
  if (!toasts.length) return null;
  return (
    <div className="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast-in flex items-start gap-3 rounded-xl bg-night-900 px-4 py-3 text-white shadow-pop">
          <Bell className="mt-0.5 size-4 shrink-0 text-wait-50" aria-hidden="true" />
          <button type="button" className="min-w-0 flex-1 text-left"
            onClick={() => { dismissToast(toast.id); if (toast.bookingId) navigate(`/requests/${toast.bookingId}`); }}>
            <span className="block text-sm font-semibold">{toast.title}</span>
            <span className="mt-0.5 block text-sm text-white/75">{toast.message}</span>
          </button>
          <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss" className="rounded p-0.5 text-white/60 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Shell() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:bg-night-950">
      <aside className="sticky top-0 hidden h-screen lg:block"><Sidebar /></aside>

      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-night-950 px-4 lg:hidden">
        <DeskLogo />
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}
          className="grid size-10 place-items-center rounded-lg text-white hover:bg-white/10">
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-night-950/60" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative h-full w-72 max-w-[85vw]">
            <Sidebar onNavigate={() => setOpen(false)} />
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu"
              className="absolute top-4 right-3 grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <main className="min-h-screen min-w-0 bg-mist">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-9"><Outlet /></div>
      </main>
      <Toasts />
    </div>
  );
}
