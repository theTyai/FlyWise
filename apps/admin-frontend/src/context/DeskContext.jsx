import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { API_ORIGIN, setSignedOutHandler, token } from '../services/api.js';
import * as authService from '../services/auth.service.js';
import { countWaiting } from '../services/booking.service.js';

const DeskContext = createContext(null);
export const useDesk = () => useContext(DeskContext);

// The signed-in admin, the live channel for new and changed requests, and the waiting count.
export function DeskProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);
  const [liveTick, setLiveTick] = useState(0);
  const [waiting, setWaiting] = useState(null);
  const [toasts, setToasts] = useState([]);

  const signOutLocally = useCallback(() => { setAdmin(null); setWaiting(null); }, []);

  useEffect(() => {
    setSignedOutHandler(signOutLocally);
    if (!token.get()) { setReady(true); return; }
    authService.getMe()
      .then((data) => setAdmin(data.admin))
      .catch(() => token.clear())
      .finally(() => setReady(true));
  }, [signOutLocally]);

  const dismissToast = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const pushToast = useCallback((toast) => {
    const id = toast.id || `${Date.now()}-${Math.random()}`;
    setToasts((list) => [...list.filter((t) => t.id !== id), { ...toast, id }].slice(-3));
    setTimeout(() => dismissToast(id), 8000);
  }, [dismissToast]);

  useEffect(() => {
    if (!admin) return undefined;
    const socket = io(API_ORIGIN, { auth: (callback) => callback({ token: token.get() }), reconnectionDelayMax: 10000 });
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('connect_error', () => setLive(false));
    socket.on('booking:new', (event) => {
      setLiveTick((tick) => tick + 1);
      pushToast({ id: event.bookingId, title: 'New booking request', message: `${event.bookingReference} is waiting for review.`, bookingId: event.bookingId });
    });
    socket.on('booking:update', () => setLiveTick((tick) => tick + 1));
    return () => { socket.disconnect(); setLive(false); };
  }, [admin?._id, pushToast]);

  // The sidebar badge: how many requests are waiting right now.
  useEffect(() => {
    if (!admin) return;
    countWaiting().then(setWaiting).catch(() => {});
  }, [admin, liveTick]);

  const can = useCallback((permission) => Boolean(admin?.permissions?.includes(permission)), [admin]);

  const value = useMemo(() => ({
    admin, ready, live, liveTick, waiting, toasts, can, pushToast, dismissToast,
    bump: () => setLiveTick((tick) => tick + 1),
    async login(email, password) {
      const data = await authService.login(email, password);
      token.set(data.accessToken);
      setAdmin(data.admin);
    },
    logout() { token.clear(); signOutLocally(); },
  }), [admin, ready, live, liveTick, waiting, toasts, can, pushToast, dismissToast, signOutLocally]);

  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}
