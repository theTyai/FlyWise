// Flight search endpoints (/flights). None of them need an account.
import { api } from './api.js';

// form: the values held by the search ticket. Returns { search, offers, recommendations }.
export const searchFlights = (form) => api.post('/flights/search', {
  origin: form.origin,
  destination: form.destination,
  departureDate: form.departureDate,
  passengers: Number(form.passengers),
  cabinClass: form.cabinClass,
  preferences: { priority: form.priority, nonStopOnly: Boolean(form.nonStopOnly) },
  naturalLanguage: form.naturalLanguage?.trim() || undefined,
});

export const getSearch = (searchId) => api.get(`/flights/search/${searchId}`);
export const getOffer = (offerId) => api.get(`/flights/offers/${offerId}`);
