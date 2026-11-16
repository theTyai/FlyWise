// Last-resort ranking used only when the AI service cannot be reached.
// It applies the same published formula (price 50%, duration 35%, stops 15%) so a
// search still returns three picks. The result is labelled LOCAL_FALLBACK and the
// traveller is told the AI service was offline. The traveller's free-text note is
// NOT interpreted here - that is the AI service's job.

const WEIGHTS = {
  BALANCED: { price: 0.5, duration: 0.35, stops: 0.15 },
  CHEAPEST: { price: 0.7, duration: 0.2, stops: 0.1 },
  FASTEST: { price: 0.25, duration: 0.6, stops: 0.15 },
};

const normalise = (values) => {
  const low = Math.min(...values);
  const high = Math.max(...values);
  return values.map((v) => (high === low ? 1 : (high - v) / (high - low)));
};
const stopsScore = (stops) => (stops === 0 ? 1 : stops === 1 ? 0.5 : 0);
const duration = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
const stopsText = (s) => (s === 0 ? 'non-stop' : s === 1 ? '1 stop' : `${s} stops`);
const money = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export function fallbackRecommendations({ flights, preferences = {} }) {
  const notes = ['The AI service is offline, so the built-in scoring formula ranked these flights.'];
  const valid = flights.filter((f) => f.price > 0 && f.durationMinutes > 0 && f.stops >= 0);
  if (!valid.length) return { engine: 'LOCAL_FALLBACK', preferences, notes, scores: {}, recommendations: [] };

  let pool = valid.filter((f) => (!preferences.nonStopOnly || f.stops === 0)
    && (!preferences.maxPrice || f.price <= preferences.maxPrice)
    && (!preferences.maxDurationMinutes || f.durationMinutes <= preferences.maxDurationMinutes));
  if (!pool.length) {
    pool = valid;
    notes.push('No flight met every preference, so these are the closest options from the full list.');
  }

  const weights = WEIGHTS[preferences.priority] || WEIGHTS.BALANCED;
  const priceScores = normalise(pool.map((f) => f.price));
  const timeScores = normalise(pool.map((f) => f.durationMinutes));
  const scores = {};
  pool.forEach((f, i) => {
    scores[f.id] = Math.round((weights.price * priceScores[i] + weights.duration * timeScores[i] + weights.stops * stopsScore(f.stops)) * 10000) / 10000;
  });

  const byPrice = [...pool].sort((a, b) => a.price - b.price || scores[b.id] - scores[a.id]);
  const byTime = [...pool].sort((a, b) => a.durationMinutes - b.durationMinutes || a.price - b.price);
  const byScore = [...pool].sort((a, b) => scores[b.id] - scores[a.id] || a.price - b.price);
  const taken = new Set();
  const take = (list) => {
    const flight = list.find((f) => !taken.has(f.id));
    if (flight) taken.add(flight.id);
    return flight;
  };
  const cheapest = take(byPrice);
  const fastest = take(byTime);
  const best = take(byScore);
  const facts = (f) => `${money(f.price)}, ${duration(f.durationMinutes)}, ${stopsText(f.stops)}`;

  const recommendations = [];
  if (best) recommendations.push({ flightId: best.id, category: 'BEST_OVERALL', score: scores[best.id], reason: `Strong balance of fare, journey time and stops (score ${scores[best.id].toFixed(2)} out of 1): ${facts(best)}.` });
  if (cheapest) recommendations.push({ flightId: cheapest.id, category: 'CHEAPEST', score: scores[cheapest.id], reason: `Lowest fare of the ${pool.length} flights compared: ${facts(cheapest)}.` });
  if (fastest) {
    const isTrueFastest = fastest.id === byTime[0].id;
    recommendations.push({
      flightId: fastest.id, category: 'FASTEST', score: scores[fastest.id],
      reason: isTrueFastest
        ? `Shortest journey of the ${pool.length} flights compared: ${facts(fastest)}.`
        : `The cheapest flight is also the quickest, so this is the next shortest journey: ${facts(fastest)}.`,
    });
  }
  return { engine: 'LOCAL_FALLBACK', preferences, notes, scores, recommendations };
}
