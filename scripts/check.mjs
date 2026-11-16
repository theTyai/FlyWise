// Asks every FlyWise service whether it is up:  npm run check
// Handy before a demo, or when something is not working and you want to see which part.
import { bold, green, readEnvFile, red, yellow } from './lib.mjs';

const env = readEnvFile();
const url = (name, fallback) => (env[name] || fallback).split(',')[0].trim().replace(/\/$/, '');

const targets = [
  { name: 'User backend', url: `${url('USER_BACKEND_URL', 'http://localhost:5000')}/health`, needed: true },
  { name: 'Admin backend', url: `${url('ADMIN_BACKEND_URL', 'http://localhost:5001')}/health`, needed: true },
  { name: 'AI service', url: `${url('AI_SERVICE_URL', 'http://localhost:8000')}/health`, needed: false },
  { name: 'Traveller app', url: url('USER_FRONTEND_ORIGIN', 'http://localhost:5173'), needed: true },
  { name: 'Desk app', url: url('ADMIN_FRONTEND_ORIGIN', 'http://localhost:5174'), needed: true },
];

async function probe(target) {
  try {
    const response = await fetch(target.url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return { ...target, up: false, detail: `HTTP ${response.status}` };
    let detail = '';
    if (target.url.endsWith('/health')) {
      const body = await response.json().catch(() => ({}));
      const data = body.data || body;
      if (data.database) detail = `database ${data.database}`;
      if (data.flightProvider?.label) detail += `, flight data: ${data.flightProvider.label}`;
      if (data.llm) detail = data.llm.configured ? `LLM: ${data.llm.model}` : 'no LLM key - formula and template explanations';
    }
    return { ...target, up: true, detail };
  } catch {
    return { ...target, up: false, detail: 'not reachable' };
  }
}

const results = await Promise.all(targets.map(probe));
console.log(bold('\nFlyWise services'));
for (const r of results) {
  const state = r.up ? green('UP  ') : r.needed ? red('DOWN') : yellow('DOWN');
  console.log(`  ${state}  ${r.name.padEnd(14)} ${r.url}${r.detail ? `   (${r.detail})` : ''}`);
}
const missing = results.filter((r) => !r.up && r.needed);
if (missing.length) {
  console.log(red(`\n${missing.length} required service(s) are not running. Start them with "npm run dev".`));
  process.exitCode = 1;
} else if (results.some((r) => !r.up)) {
  console.log(yellow('\nThe AI service is optional: without it, search uses the built-in scoring formula.'));
} else {
  console.log(green('\nEverything is running.'));
}
