import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Plane, User, X } from 'lucide-react';
import { cx } from '@shared/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function Logo({ dark = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="FlyWise home">
      <span className={cx('grid size-9 place-items-center rounded-xl', dark ? 'bg-white text-night-900' : 'bg-night-900 text-white')}>
        <Plane className="size-[18px] -rotate-45" strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className={cx('text-xl font-bold tracking-tight', dark ? 'text-white' : 'text-ink')}>FlyWise</span>
    </Link>
  );
}

function UserMenu({ dark }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const initials = user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button" onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open}
        className={cx('flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm font-semibold transition-colors',
          dark ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-night-900/5')}
      >
        <span className={cx('grid size-8 place-items-center rounded-full text-[13px]', dark ? 'bg-white/15' : 'bg-signal-100 text-signal-700')}>{initials}</span>
        <span className="hidden sm:block">{user.name.split(' ')[0]}</span>
        <ChevronDown className="size-4 opacity-60" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white py-1.5 text-ink shadow-pop">
          <p className="truncate px-4 pt-1.5 pb-2 text-[13px] text-ink-faint">{user.email}</p>
          <Link role="menuitem" to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[15px] hover:bg-mist">
            <User className="size-4 text-ink-faint" aria-hidden="true" /> Profile
          </Link>
          <button
            role="menuitem" type="button"
            onClick={async () => { setOpen(false); await logout(); navigate('/'); }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[15px] hover:bg-mist"
          >
            <LogOut className="size-4 text-ink-faint" aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useAuth();
  const navigate = useNavigate();
  if (!toasts.length) return null;
  return (
    <div className="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast-in flex items-start gap-3 rounded-xl bg-night-900 px-4 py-3 text-white shadow-pop">
          <Bell className="mt-0.5 size-4 shrink-0 text-signal-200" aria-hidden="true" />
          <button
            type="button" className="min-w-0 flex-1 text-left"
            onClick={() => { dismissToast(toast.id); if (toast.bookingId) navigate(`/trips/${toast.bookingId}`); }}
          >
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

export default function Layout() {
  const { user, ready, unread } = useAuth();
  const { pathname } = useLocation();
  const dark = pathname === '/'; // the landing page nav sits on the navy hero
  const link = ({ isActive }) => cx(
    'rounded-lg px-3 py-2 text-[15px] font-medium transition-colors',
    dark ? 'text-white/80 hover:text-white' : isActive ? 'text-signal-700' : 'text-ink-soft hover:text-ink',
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className={cx(dark ? 'bg-night-900' : 'sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur')}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-6">
            <Logo dark={dark} />
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
              <NavLink to="/" end className={link}>Search flights</NavLink>
              {user && <NavLink to="/trips" className={link}>My trips</NavLink>}
            </nav>
          </div>
          <div className="flex items-center gap-1.5">
            {ready && user && (
              <>
                <NavLink to="/trips" className={cx(link({ isActive: false }), 'sm:hidden')}>My trips</NavLink>
                <Link
                  to="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                  className={cx('relative grid size-10 place-items-center rounded-full transition-colors', dark ? 'text-white hover:bg-white/10' : 'text-ink-soft hover:bg-night-900/5')}
                >
                  <Bell className="size-5" aria-hidden="true" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 grid min-w-[18px] place-items-center rounded-full bg-flare-600 px-1 text-[11px] leading-[18px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
                <UserMenu dark={dark} />
              </>
            )}
            {ready && !user && (
              <>
                <Link to="/login" className={link({ isActive: false })}>Sign in</Link>
                <Link
                  to="/register"
                  className={cx('rounded-xl px-4 py-2 text-[15px] font-semibold transition-colors', dark ? 'bg-white text-night-900 hover:bg-signal-100' : 'bg-night-900 text-white hover:bg-night-800')}
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="mt-20 border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-ink-soft md:flex-row md:items-start md:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-md">
              An academic minor project. Bookings here are requests approved against simulated seat inventory.
              No airline ticket is issued and no payment is taken.
            </p>
          </div>
          <nav className="flex gap-6" aria-label="Footer">
            <Link to="/" className="hover:text-ink">Search flights</Link>
            <Link to="/trips" className="hover:text-ink">My trips</Link>
            <Link to="/notifications" className="hover:text-ink">Notifications</Link>
          </nav>
        </div>
      </footer>
      <Toasts />
    </div>
  );
}
