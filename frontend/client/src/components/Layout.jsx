import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Info, LogOut, Menu, Plane, Sparkles, User, X } from 'lucide-react';
import { cx } from '@shared/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function Logo({ dark = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 group" aria-label="FlyWise AI home">
      <span className={cx('grid size-9 place-items-center rounded-xl transition-transform group-hover:scale-105', dark ? 'bg-white text-night-900 shadow-md' : 'bg-night-900 text-white shadow-sm')}>
        <Plane className="size-[18px] -rotate-45 text-signal-600 dark:text-night-900" strokeWidth={2.4} aria-hidden="true" />
      </span>
      <div className="flex items-center gap-1.5">
        <span className={cx('text-xl font-bold tracking-tight', dark ? 'text-white' : 'text-ink')}>FlyWise</span>
        <span className="rounded bg-signal-600 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white">AI</span>
      </div>
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
        className={cx('flex items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-sm font-semibold transition-all',
          dark ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-night-900/5')}
      >
        <span className={cx('grid size-8 place-items-center rounded-full text-[13px] font-bold shadow-xs', dark ? 'bg-signal-600 text-white' : 'bg-signal-100 text-signal-700')}>{initials}</span>
        <span className="hidden sm:block">{user.name.split(' ')[0]}</span>
        <ChevronDown className="size-4 opacity-60" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-white py-1.5 text-ink shadow-pop">
          <div className="border-b border-line px-4 pt-2 pb-2.5">
            <p className="font-semibold text-[14px] text-ink">{user.name}</p>
            <p className="truncate text-[12px] text-ink-faint">{user.email}</p>
          </div>
          <Link role="menuitem" to="/trips" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[14px] font-medium hover:bg-mist">
            <Plane className="size-4 text-ink-faint" aria-hidden="true" /> My Bookings
          </Link>
          <Link role="menuitem" to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[14px] font-medium hover:bg-mist">
            <User className="size-4 text-ink-faint" aria-hidden="true" /> Profile Settings
          </Link>
          <div className="my-1 border-t border-line" />
          <button
            role="menuitem" type="button"
            onClick={async () => { setOpen(false); await logout(); navigate('/'); }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] font-medium text-stop-700 hover:bg-stop-50"
          >
            <LogOut className="size-4" aria-hidden="true" /> Sign out
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
        <div key={toast.id} className="toast-in flex items-start gap-3 rounded-2xl bg-night-900 border border-white/10 px-4 py-3.5 text-white shadow-pop">
          <Bell className="mt-0.5 size-4 shrink-0 text-signal-200" aria-hidden="true" />
          <button
            type="button" className="min-w-0 flex-1 text-left"
            onClick={() => { dismissToast(toast.id); if (toast.bookingId) navigate(`/trips/${toast.bookingId}`); }}
          >
            <span className="block text-sm font-semibold">{toast.title}</span>
            <span className="mt-0.5 block text-xs text-white/75 leading-relaxed">{toast.message}</span>
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
  const [mobileMenu, setMobileMenu] = useState(false);
  const dark = pathname === '/'; // the landing page nav sits on the navy hero

  const link = ({ isActive }) => cx(
    'rounded-xl px-3.5 py-2 text-[14px] font-semibold transition-colors',
    dark
      ? isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
      : isActive ? 'bg-signal-50 text-signal-700' : 'text-ink-soft hover:bg-mist hover:text-ink',
  );

  return (
    <div className="flex min-h-screen flex-col bg-mist">
      <header className={cx(
        'sticky top-0 z-40 transition-all duration-200',
        dark
          ? 'border-b border-white/10 bg-night-950/80 backdrop-blur-xl'
          : 'border-b border-line bg-white/85 backdrop-blur-xl shadow-xs'
      )}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-8">
            <Logo dark={dark} />
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
              <NavLink to="/" end className={link}>Explore Flights</NavLink>
              <NavLink to="/how-we-work" className={link}>How We Work</NavLink>
              {user && <NavLink to="/trips" className={link}>My Bookings</NavLink>}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Engine Indicator */}
            <div className={cx(
              'hidden lg:flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold border tracking-wide',
              dark
                ? 'border-white/15 bg-white/5 text-white/90'
                : 'border-mint-600/20 bg-mint-50/70 text-mint-700'
            )}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint-600 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-mint-600"></span>
              </span>
              <span>Gemini AI & Live Seats Online</span>
            </div>
            {ready && user && (
              <>
                <Link
                  to="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                  className={cx('relative grid size-10 place-items-center rounded-full transition-colors', dark ? 'text-white hover:bg-white/10' : 'text-ink-soft hover:bg-mist hover:text-ink')}
                >
                  <Bell className="size-5" aria-hidden="true" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 grid min-w-[18px] place-items-center rounded-full bg-flare-600 px-1 text-[10px] leading-[18px] font-bold text-white shadow-xs">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
                <UserMenu dark={dark} />
              </>
            )}

            {ready && !user && (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/login" className={link({ isActive: false })}>Sign in</Link>
                <Link
                  to="/register"
                  className={cx('rounded-xl px-4 py-2 text-[14px] font-semibold transition-all shadow-sm', dark ? 'bg-white text-night-900 hover:bg-signal-100 hover:scale-102' : 'btn-gradient text-white')}
                >
                  Create account
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenu((v) => !v)}
              aria-label="Toggle navigation menu"
              className={cx('grid size-10 place-items-center rounded-xl md:hidden', dark ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-mist')}
            >
              {mobileMenu ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenu && (
          <div className="border-b border-line bg-white p-4 shadow-xl md:hidden text-ink">
            <nav className="flex flex-col gap-2">
              <Link to="/" onClick={() => setMobileMenu(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-mist">
                Explore Flights
              </Link>
              <Link to="/how-we-work" onClick={() => setMobileMenu(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-mist">
                How We Work
              </Link>
              {user ? (
                <>
                  <Link to="/trips" onClick={() => setMobileMenu(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-mist">
                    My Bookings
                  </Link>
                  <Link to="/profile" onClick={() => setMobileMenu(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-mist">
                    Profile Settings
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenu(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-mist">
                    Sign In
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenu(false)} className="rounded-xl bg-signal-600 px-4 py-2.5 text-center text-sm font-semibold text-white">
                    Create Account
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="mt-24 border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <Logo />
              <p className="mt-3.5 max-w-sm text-sm text-ink-soft leading-relaxed">
                FlyWise AI is an intelligent flight discovery and booking platform powered by real DGCA flight schedules and multi-criteria AI recommendations.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-signal-50 px-3 py-1 text-xs font-semibold text-signal-700">
                  <Sparkles className="size-3" /> AI-Powered Search
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-700">
                  Zero Paid APIs Required
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-faint">Platform</h4>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                <li><Link to="/" className="hover:text-signal-600 transition-colors">Search Flights</Link></li>
                <li><Link to="/how-we-work" className="hover:text-signal-600 transition-colors">How We Work (Architecture)</Link></li>
                <li><Link to="/trips" className="hover:text-signal-600 transition-colors">My Bookings</Link></li>
                <li><Link to="/notifications" className="hover:text-signal-600 transition-colors">Live Notifications</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-faint">Project Scope</h4>
              <p className="mt-3 text-xs text-ink-soft leading-relaxed">
                Academic Minor Project. Bookings represent internal reservation requests checked against simulated seat inventory. No payment is processed.
              </p>
              <p className="mt-3 text-xs font-medium text-ink-faint">
                Built with React, Node.js, Express, FastAPI & MongoDB.
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-line pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-faint">
            <p>© 2026 FlyWise AI. Academic Full-Stack Demonstration.</p>
            <div className="flex gap-4">
              <span>Privacy Safe</span>
              <span>•</span>
              <span>Deterministic Pricing</span>
              <span>•</span>
              <span>Human-in-the-Loop Desk</span>
            </div>
          </div>
        </div>
      </footer>
      <Toasts />
    </div>
  );
}
