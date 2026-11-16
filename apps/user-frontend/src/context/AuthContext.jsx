import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_ORIGIN, currentTokens, setSignedOutHandler, tokens } from '../services/api.js';
import * as authService from '../services/auth.service.js';
import { listNotifications } from '../services/notification.service.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Holds the signed-in traveller and the live channel (Socket.IO) for booking updates.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [liveTick, setLiveTick] = useState(0); // increments whenever a booking changes on the server
  const socketRef = useRef(null);

  const signOutLocally = useCallback(() => { setUser(null); setUnread(0); }, []);

  useEffect(() => {
    setSignedOutHandler(signOutLocally);
    if (!currentTokens()?.accessToken) { setReady(true); return; }
    authService.getMe()
      .then((data) => setUser(data.user))
      .catch(() => tokens.clear())
      .finally(() => setReady(true));
  }, [signOutLocally]);

  const dismissToast = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const pushToast = useCallback((toast) => {
    const id = toast.id || `${Date.now()}-${Math.random()}`;
    setToasts((list) => [...list.filter((t) => t.id !== id), { ...toast, id }].slice(-3));
    setTimeout(() => dismissToast(id), 7000);
  }, [dismissToast]);

  const refreshUnread = useCallback(() => {
    listNotifications().then((data) => setUnread(data.unreadCount)).catch(() => { });
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    refreshUnread();
    const socket = io(API_ORIGIN, {
      auth: (callback) => callback({ token: currentTokens()?.accessToken }),
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;
    socket.on('notification', (notification) => {
      setUnread((count) => count + 1);
      pushToast({ id: notification.id, title: notification.title, message: notification.message, bookingId: notification.bookingId });
    });
    socket.on('booking:update', () => setLiveTick((tick) => tick + 1));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user?._id, pushToast, refreshUnread]);

  const value = useMemo(() => ({
    user, ready, unread, toasts, liveTick, dismissToast, pushToast, refreshUnread, setUnread,
    async login(email, password) {
      const data = await authService.login(email, password);
      tokens.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      setUser(data.user);
    },
    async register(form) {
      const data = await authService.register(form);
      tokens.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      setUser(data.user);
    },
    async logout() {
      try { await authService.logout(); } catch { /* signing out locally is enough */ }
      tokens.clear();
      signOutLocally();
    },
    setUser,
  }), [user, ready, unread, toasts, liveTick, dismissToast, pushToast, refreshUnread, signOutLocally]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
