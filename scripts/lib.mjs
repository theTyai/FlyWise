// Helpers shared by the scripts in this folder. They use only Node's standard library,
// so they work before "npm install" has ever run.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const AI_DIR = path.join(ROOT, 'services', 'ai-recommendation');
export const isWindows = process.platform === 'win32';

const colour = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
export const green = colour(32);
export const yellow = colour(33);
export const red = colour(31);
export const bold = colour(1);
export const dim = colour(2);

// Read KEY=value lines from a .env file into an object ({} when the file is missing).
export function readEnvFile(file = path.join(ROOT, '.env')) {
  if (!fs.existsSync(file)) return {};
  const values = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const at = line.indexOf('=');
    values[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^["']|["']$/g, '');
  }
  return values;
}

// On Windows, npm is a .cmd file and can only be started through the shell. Real programs
// (python.exe, py.exe) are started directly, which also keeps paths with spaces intact.
const needsShell = (command) => isWindows && /^(npm|npx)$/.test(command);

// Run a command and wait for it. Returns true when it exits with code 0.
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: ROOT, shell: needsShell(command), ...options });
  return result.status === 0;
}

// Run a command quietly and return what it printed, or null when it is missing or fails.
export function capture(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', shell: needsShell(command) });
  if (result.error || result.status !== 0) return null;
  return `${result.stdout || ''}${result.stderr || ''}`.trim();
}

// The Python inside the AI service's virtual environment (created by "npm run setup").
export function venvPython() {
  const file = isWindows
    ? path.join(AI_DIR, '.venv', 'Scripts', 'python.exe')
    : path.join(AI_DIR, '.venv', 'bin', 'python');
  return fs.existsSync(file) ? file : null;
}

// A system Python 3.10 or newer, as { command, args, version }, or null when none is installed.
// On Windows the "py" launcher is tried first because a bare "python" can be the Store stub.
export function systemPython() {
  const candidates = isWindows
    ? [['py', ['-3']], ['python', []], ['python3', []]]
    : [['python3', []], ['python', []]];
  for (const [command, args] of candidates) {
    const out = capture(command, [...args, '--version']);
    const match = out && /Python (\d+)\.(\d+)/.exec(out);
    if (match && (Number(match[1]) > 3 || (Number(match[1]) === 3 && Number(match[2]) >= 10))) {
      return { command, args, version: `${match[1]}.${match[2]}` };
    }
  }
  return null;
}
