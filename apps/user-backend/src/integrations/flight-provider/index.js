// Flight-provider abstraction. The rest of the backend only knows this interface:
//   provider.name  'MOCK' | 'DUFFEL'
//   provider.mode  'MOCK' | 'LIVE'
//   provider.search({ origin, destination, departureDate, passengers, cabinClass }) -> normalised offers
// Adding Amadeus or another source means adding one file here and one case below.
import { config } from '../../config/index.js';
import { mockProvider } from './mockProvider.js';
import { createDuffelProvider } from './duffelProvider.js';

let provider;

export function getFlightProvider() {
  if (provider) return provider;
  switch (config.flightProvider) {
    case 'mock':
      provider = mockProvider;
      break;
    case 'duffel':
      provider = createDuffelProvider(config.duffelToken); // throws at start-up if the token is missing
      break;
    default:
      throw new Error(`Unknown FLIGHT_PROVIDER "${config.flightProvider}". Use "mock" or "duffel".`);
  }
  return provider;
}
