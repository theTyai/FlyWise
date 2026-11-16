// Client for the Python AI recommendation service.
// The reply is treated as untrusted: only flight ids that exist in this search are
// accepted, and every price or time shown to the traveller comes from our own data.
import { config } from '../../config/index.js';

const CATEGORIES = ['BEST_OVERALL', 'CHEAPEST', 'FASTEST'];

async function post(path, body, timeoutMs) {
  const response = await fetch(`${config.aiServiceUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-key': config.internalKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`AI service replied HTTP ${response.status}`);
  return response.json();
}

// Returns a validated result, or throws so the caller can fall back.
export async function requestRecommendations({ flights, preferences, naturalLanguage, currency }) {
  const data = await post('/recommend', { flights, preferences, naturalLanguage: naturalLanguage || null, currency }, 20000);
  const knownIds = new Set(flights.map((f) => f.id));
  const seenIds = new Set();
  const seenCategories = new Set();
  const recommendations = [];
  for (const item of Array.isArray(data.recommendations) ? data.recommendations : []) {
    const valid = item && knownIds.has(item.flightId) && CATEGORIES.includes(item.category)
      && typeof item.reason === 'string' && item.reason.trim()
      && !seenIds.has(item.flightId) && !seenCategories.has(item.category);
    if (!valid) throw new Error('AI service returned a recommendation that does not match this search');
    seenIds.add(item.flightId);
    seenCategories.add(item.category);
    recommendations.push({
      flightId: item.flightId, category: item.category,
      reason: item.reason.trim().slice(0, 500), score: Number(item.score) || 0,
    });
  }
  if (flights.length && !recommendations.length) throw new Error('AI service returned no recommendations');
  return {
    engine: data.engine === 'LLM' ? 'LLM' : 'DETERMINISTIC',
    preferences: data.preferences || preferences,
    notes: Array.isArray(data.notes) ? data.notes.filter((n) => typeof n === 'string').slice(0, 6) : [],
    scores: data.scores && typeof data.scores === 'object' ? data.scores : {},
    recommendations,
  };
}

export async function aiServiceHealth() {
  try {
    const response = await fetch(`${config.aiServiceUrl}/health`, { signal: AbortSignal.timeout(2500) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
