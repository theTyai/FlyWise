// Flight search: fetch offers, rank them, and store everything so a booking can refer back.
//
//   provider.search()  ->  normalised offers
//   AI service         ->  three recommendations (falls back to the local formula if offline)
//   MongoDB            ->  the search, its offers and the picks
import { isValidId, mongoose } from '@flywise/shared/db.js';
import { ApiError } from '@flywise/shared/http.js';
import { FlightOffer, Search } from '@flywise/shared/models.js';
import { istHour } from '@flywise/shared/time.js';
import { requestRecommendations } from '../integrations/ai-service/client.js';
import { getFlightProvider } from '../integrations/flight-provider/index.js';
import { serializeOffer, serializeRecommendation, serializeSearch } from '../utils/serializers.js';
import { fallbackRecommendations } from './fallbackRanking.service.js';

// The AI service receives only ids and comparable facts - never names, emails or other personal data.
const toRankingInput = (offer) => ({
  id: String(offer._id),
  price: offer.pricePerPassenger,
  durationMinutes: offer.durationMinutes,
  stops: offer.stops,
  departureHour: istHour(offer.departureTime),
  airline: offer.airline,
  flightNumber: offer.flightNumber,
  baggage: offer.baggage?.checked,
});

async function rank(offers, preferences, naturalLanguage) {
  if (!offers.length) return { engine: 'NONE', preferences, notes: [], scores: {}, recommendations: [] };
  const flights = offers.map(toRankingInput);
  const cleanPrefs = Object.fromEntries(Object.entries(preferences).filter(([, v]) => v !== null && v !== undefined));
  try {
    return await requestRecommendations({ flights, preferences: cleanPrefs, naturalLanguage, currency: offers[0].currency });
  } catch (err) {
    console.warn(`[search] AI service unavailable (${err.message}); using the local scoring formula`);
    const ranking = fallbackRecommendations({ flights, preferences: cleanPrefs });
    if (naturalLanguage) ranking.notes.push('Your written note could not be read while the AI service is offline.');
    return ranking;
  }
}

export async function runSearch(query, user) {
  const { origin, destination, departureDate, passengers, cabinClass, preferences, naturalLanguage } = query;
  const provider = getFlightProvider();
  const searchId = new mongoose.Types.ObjectId();

  // 1. Live or sample offers, already converted to the internal flight shape.
  const normalised = await provider.search({ origin, destination, departureDate, passengers, cabinClass });
  const offers = normalised.map((offer) => ({ ...offer, _id: new mongoose.Types.ObjectId(), searchId }));

  // 2. Rank them.
  const ranking = await rank(offers, preferences, naturalLanguage);

  // 3. Persist the search, its offers and the picks.
  const search = await Search.create({
    _id: searchId,
    userId: user?._id || null,
    origin, destination, departureDate, passengers, cabinClass,
    preferences, naturalLanguage: naturalLanguage || '',
    appliedPreferences: ranking.preferences,
    provider: provider.name, providerMode: provider.mode,
    engine: ranking.engine, engineNotes: ranking.notes,
    recommendations: ranking.recommendations.map((r) => ({
      offerId: r.flightId, category: r.category, reason: r.reason, score: r.score,
    })),
    offerCount: offers.length,
  });
  if (offers.length) await FlightOffer.insertMany(offers);

  return {
    search: serializeSearch(search),
    offers: offers.map((o) => serializeOffer(o, ranking.scores[String(o._id)])),
    recommendations: search.recommendations.map(serializeRecommendation),
  };
}

async function loadSearch(id) {
  const search = isValidId(id) ? await Search.findById(id) : null;
  if (!search) throw new ApiError(404, 'SEARCH_NOT_FOUND', 'This search no longer exists. Search again.');
  return search;
}

export async function getSearch(id) {
  const search = await loadSearch(id);
  const offers = await FlightOffer.find({ searchId: search._id }).sort({ departureTime: 1 });
  return {
    search: serializeSearch(search),
    offers: offers.map((o) => serializeOffer(o)),
    recommendations: search.recommendations.map(serializeRecommendation),
  };
}

export async function getRecommendations(id) {
  const search = await loadSearch(id);
  return {
    engine: search.engine,
    notes: search.engineNotes,
    recommendations: search.recommendations.map(serializeRecommendation),
  };
}

export async function getOffer(id) {
  const offer = isValidId(id) ? await FlightOffer.findById(id) : null;
  if (!offer) throw new ApiError(404, 'OFFER_NOT_FOUND', 'This fare no longer exists. Search again.');
  const search = await Search.findById(offer.searchId);
  const pick = search?.recommendations.find((r) => String(r.offerId) === String(offer._id));
  return {
    offer: serializeOffer(offer),
    search: search ? serializeSearch(search) : null,
    recommendation: pick ? serializeRecommendation(pick) : null,
  };
}
