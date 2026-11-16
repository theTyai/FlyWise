// Flight-provider abstraction. The rest of the backend only knows this interface:
//   provider.name  'REAL_SCHEDULE' | 'MOCK' | 'DUFFEL'
//   provider.mode  'LIVE' | 'MOCK'
//   provider.search({ origin, destination, departureDate, passengers, cabinClass }) -> normalised offers
import { config } from '../../config/index.js';
import { realScheduleProvider } from './realScheduleProvider.js';
import { mockProvider } from './mockProvider.js';

let provider;

export function getFlightProvider() {
  if (provider) return provider;
  switch (config.flightProvider) {
    case 'real_schedule':
    case 'real':
    case 'live':
      provider = realScheduleProvider;
      break;
    case 'mock':
      provider = mockProvider;
      break;
    default:
      // Default to real airline schedules
      provider = realScheduleProvider;
      break;
  }
  return provider;
}
