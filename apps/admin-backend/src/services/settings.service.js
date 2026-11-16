// Global settings and a live health check of the other FlyWise services.
import { Setting, getSettings } from '@flywise/shared/models.js';
import { config } from '../config/index.js';
import { serializeSettings } from '../utils/serializers.js';
import { writeAudit } from './audit.service.js';

export async function readSettings() {
  return serializeSettings(await getSettings());
}

export async function updateSettings(admin, changes) {
  const before = await getSettings();
  const settings = await Setting.findOneAndUpdate({ _id: 'global' }, { $set: changes }, { new: true });
  await writeAudit(admin, 'SETTINGS_UPDATED', null, {
    meta: { defaultSimulatedSeats: { from: before.defaultSimulatedSeats, to: settings.defaultSimulatedSeats } },
  });
  return serializeSettings(settings);
}

async function ping(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

// Read at request time, so the Settings page always shows the current state.
export async function serviceStatus() {
  const [userBackend, ai] = await Promise.all([
    ping(`${config.userBackendUrl}/health`),
    ping(`${config.aiServiceUrl}/health`),
  ]);
  const aiDetail = () => {
    if (!ai) return 'Not reachable - searches fall back to the built-in formula';
    return ai.llm?.configured ? `Explanations by ${ai.llm.model}` : 'Scoring formula with template explanations (no LLM key set)';
  };
  return [
    { name: 'Admin backend', status: 'up', detail: 'This service' },
    {
      name: 'User backend', status: userBackend ? 'up' : 'down',
      detail: userBackend?.data?.flightProvider?.label ? `Flight data: ${userBackend.data.flightProvider.label}` : 'Not reachable',
    },
    { name: 'AI recommendation service', status: ai ? 'up' : 'down', detail: aiDetail() },
  ];
}
