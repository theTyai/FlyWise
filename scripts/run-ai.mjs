// Starts the Python AI recommendation service on port 8000:  npm run dev:ai
// With --test it runs the service's unit tests instead:      npm run test:ai
//
// It uses the virtual environment created by "npm run setup". If Python or its packages
// are missing it explains what to do and exits quietly, so "npm run dev" keeps the other
// services running - flight search then uses the backend's built-in scoring formula.
import { spawn } from 'node:child_process';
import { AI_DIR, capture, readEnvFile, systemPython, venvPython, yellow } from './lib.mjs';

const testing = process.argv.includes('--test');
const system = systemPython();
const python = venvPython() ? { command: venvPython(), args: [] } : system;

const explain = (reason) => {
  console.log(yellow(`[ai] ${reason}`));
  console.log(yellow('[ai] Run "npm run setup" to install it. Until then, search uses the built-in scoring formula.'));
  process.exit(testing ? 1 : 0);
};

if (!python) explain('Python 3.10+ is not installed, so the AI service was not started.');
// Importing the packages is the reliable test that they are installed.
const needed = testing ? 'import pytest, pydantic' : 'import fastapi, uvicorn, pydantic';
if (capture(python.command, [...python.args, '-c', needed]) === null) {
  explain('The AI service\'s Python packages are not installed.');
}

const port = (() => {
  try { return new URL(readEnvFile().AI_SERVICE_URL || 'http://localhost:8000').port || '8000'; } catch { return '8000'; }
})();
const args = testing
  ? [...python.args, '-m', 'pytest', '-q']
  : [...python.args, '-m', 'uvicorn', 'app.main:app', '--reload', '--port', port];

const child = spawn(python.command, args, { cwd: AI_DIR, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
