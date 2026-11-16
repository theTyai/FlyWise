// The one HTTP client of the desk app. Every request goes through request(), which adds
// the admin token, unwraps the API's { success, data, meta } envelope and turns failures
// into an ApiFailure with a readable message. Pages call the functions in the other
// services/*.service.js files, which list every endpoint the desk uses.
import axios from 'axios';

const baseURL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:5001/api/v1/admin';
export const API_ORIGIN = baseURL.replace(/\/api\/v1\/admin\/?$/, '');

// Desk sessions live for one browser tab (sessionStorage): closing the tab signs the admin out.
const STORAGE_KEY = 'flywise.desk.token';
let memory = (() => { try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; } })();

export const token = {
  get: () => memory,
  set(value) { memory = value; try { sessionStorage.setItem(STORAGE_KEY, value); } catch { /* keep in memory */ } },
  clear() { memory = null; try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } },
};

export class ApiFailure extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details || [];
  }
}

let onSignedOut = () => { };
export const setSignedOutHandler = (fn) => { onSignedOut = fn; };

const http = axios.create({ baseURL, timeout: 20000 });
http.interceptors.request.use((request) => {
  if (memory) request.headers.Authorization = `Bearer ${memory}`;
  return request;
});

// Resolves with the response "data"; paginated lists also carry "meta" (page, pages, total).
export async function request(method, url, body, headers) {
  try {
    const response = await http.request({ method, url, data: body, headers });
    const { data, meta } = response.data;
    return meta ? { ...data, meta } : data;
  } catch (error) {
    if (error.response?.data?.error) {
      const failure = new ApiFailure({ status: error.response.status, ...error.response.data.error });
      if (failure.status === 401 && !url.startsWith('/auth/login')) { token.clear(); onSignedOut(); }
      throw failure;
    }
    if (error.code === 'ECONNABORTED') {
      throw new ApiFailure({ status: 0, code: 'TIMEOUT', message: 'The admin backend took too long to answer. Try again.' });
    }
    throw new ApiFailure({ status: 0, code: 'NETWORK', message: 'Cannot reach the admin backend. Check that it is running on port 5001, then try again.' });
  }
}

export const api = {
  get: (url) => request('get', url),
  post: (url, body, headers) => request('post', url, body, headers),
  patch: (url, body) => request('patch', url, body),
};

// Build a query string from an object, skipping empty values.
export const query = (params = {}) => {
  if (!params || typeof params !== 'object') return '';
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
  return s ? `?${s}` : '';
};
