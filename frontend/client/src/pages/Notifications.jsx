import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, Bell, CircleCheck, CircleX, Send, TriangleAlert, Undo2 } from 'lucide-react';
import { ago, stamp } from '@shared/ui/format.js';
import { Button, EmptyState, Notice, PageLoading, cx } from '@shared/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLoad } from '../hooks/useLoad.js';
import { listNotifications, markAllRead, markRead } from '../services/notification.service.js';

// Each kind of update gets the colour of the booking status it reports.
const KIND = {
  BOOKING_REQUEST_CREATED: { Icon: Send, tone: 'bg-signal-100 text-signal-700' },
  BOOKING_CONFIRMED: { Icon: CircleCheck, tone: 'bg-mint-50 text-mint-700' },
  BOOKING_REJECTED: { Icon: CircleX, tone: 'bg-stop-50 text-stop-700' },
  BOOKING_REVOKED: { Icon: Undo2, tone: 'bg-void-50 text-void-700' },
  BOOKING_CANCELLED: { Icon: Ban, tone: 'bg-night-900/8 text-ink-soft' },
  PRICE_CHANGED: { Icon: TriangleAlert, tone: 'bg-wait-50 text-wait-700' },
  BOOKING_FAILED: { Icon: TriangleAlert, tone: 'bg-stop-50 text-stop-700' },
};

export default function Notifications() {
  const { liveTick, setUnread } = useAuth();
  const navigate = useNavigate();
  // Loading the list also brings the header's unread badge up to date.
  const { data, error, setData, setError } = useLoad(
    () => listNotifications().then((result) => { setUnread(result.unreadCount); return result; }),
    [liveTick, setUnread],
  );
  const items = data?.notifications ?? null;
  const setItems = (update) => setData((current) => ({ ...current, notifications: update(current.notifications) }));
  const [busy, setBusy] = useState(false);

  async function readAll() {
    setBusy(true);
    try {
      await markAllRead();
      setItems((list) => list.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function open(item) {
    if (!item.read) {
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnread((count) => Math.max(0, count - 1));
      markRead(item.id).catch(() => {});
    }
    if (item.bookingId) navigate(`/trips/${item.bookingId}`);
  }

  const unreadCount = (items || []).filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-ink-soft">
            {unreadCount ? `${unreadCount} unread. ` : ''}Every change to a booking request is listed here.
          </p>
        </div>
        {unreadCount > 0 && <Button variant="outline" size="sm" loading={busy} onClick={readAll}>Mark all as read</Button>}
      </div>

      {error && <Notice tone="error" className="mt-6">{error}</Notice>}
      {!items && !error && <PageLoading label="Loading notifications" />}
      {items && items.length === 0 && (
        <div className="mt-8">
          <EmptyState icon={Bell} title="Nothing here yet">When you send a booking request, every update on it shows up here.</EmptyState>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="mt-8 overflow-hidden rounded-2xl bg-white shadow-pass">
          {items.map((item) => {
            const kind = KIND[item.type] || KIND.BOOKING_REQUEST_CREATED;
            return (
              <li key={item.id} className="border-b border-line last:border-0">
                <button
                  type="button" onClick={() => open(item)}
                  className={cx('flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-mist', !item.read && 'bg-signal-50/60')}
                >
                  <span className={cx('grid size-10 shrink-0 place-items-center rounded-full', kind.tone)}>
                    <kind.Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className={cx('text-[15px]', item.read ? 'font-medium' : 'font-bold')}>{item.title}</span>
                      <time dateTime={item.createdAt} title={stamp(item.createdAt)} className="text-sm text-ink-faint">{ago(item.createdAt)}</time>
                    </span>
                    <span className="mt-0.5 block text-[15px] text-ink-soft">{item.message}</span>
                  </span>
                  {!item.read && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-signal-600" aria-label="Unread" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
