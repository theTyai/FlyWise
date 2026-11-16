// The one HTTP client of the traveller app. Every request goes through request():
//  - adds the access token,
//  - unwraps the API's { success, data } envelope,
//  - turns every failure into an ApiFailure with a readable message,
//  - and, when the access token has expired, uses the refresh token once and retries.
// Pages do not import this file directly; they call the functions in the other
// services/*.service.js files, which list every endpoint the app uses.
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
export const API_ORIGIN = baseURL.replace(/\/api\/v1\/?$/, '');

const STORAGE_KEY = 'flywise.traveller.tokens';

export const tokens = {
  get() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
  },
  set(value) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* private mode: stay signed in for this tab only */ }
    memory = value;
  },
  clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    memory = null;
  },
};
let memory = tokens.get();
export const currentTokens = () => memory;

export class ApiFailure extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details || [];
  }
}

const http = axios.create({ baseURL, timeout: 30000 });

http.interceptors.request.use((request) => {
  if (memory?.accessToken) request.headers.Authorization = `Bearer ${memory.accessToken}`;
  return request;
});

let refreshing = null;
let onSignedOut = () => {};
export const setSignedOutHandler = (fn) => { onSignedOut = fn; };

async function refreshTokens() {
  if (!memory?.refreshToken) throw new Error('no refresh token');
  refreshing ||= axios.post(`${baseURL}/auth/refresh`, { refreshToken: memory.refreshToken })
    .then((response) => {
      const { accessToken, refreshToken } = response.data.data;
      tokens.set({ accessToken, refreshToken });
    })
    .finally(() => { refreshing = null; });
  return refreshing;
}

function toFailure(error) {
  if (error.response?.data?.error) {
    return new ApiFailure({ status: error.response.status, ...error.response.data.error });
  }
  if (error.code === 'ECONNABORTED') {
    return new ApiFailure({ status: 0, code: 'TIMEOUT', message: 'The server took too long to answer. Try again.' });
  }
  return new ApiFailure({ status: 0, code: 'NETWORK', message: 'Cannot reach the FlyWise server. Check that the user backend is running, then try again.' });
}

// One function for every request. Resolves with the "data" part of the API response.
export async function request(method, url, body) {
  try {
    const response = await http.request({ method, url, data: body });
    return response.data.data;
  } catch (error) {
    const expired = error.response?.status === 401 && error.response.data?.error?.code === 'TOKEN_INVALID';
    if (expired && memory?.refreshToken) {
      try {
        await refreshTokens();
        const retry = await http.request({ method, url, data: body });
        return retry.data.data;
      } catch (retryError) {
        if (!retryError.response || retryError.response.status === 401) {
          tokens.clear();
          onSignedOut();
          throw new ApiFailure({ status: 401, code: 'SESSION_EXPIRED', message: 'Your session has expired. Sign in again.' });
        }
        throw toFailure(retryError);
      }
    }
    throw toFailure(error);
  }
}

export const api = {
  get: (url) => request('get', url),
  post: (url, body) => request('post', url, body),
  patch: (url, body) => request('patch', url, body),
};
