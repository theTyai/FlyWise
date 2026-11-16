// One-time project setup:  npm run setup   (or double-click setup.bat on Windows)
//
//   1. checks the Node.js version
//   2. creates .env from .env.example with freshly generated secrets (never overwrites one)
//   3. installs the JavaScript packages for every app (npm install)
//   4. creates a Python virtual environment for the AI service and installs its packages
//   5. checks that MongoDB is reachable
//
// Safe to run again at any time: every step skips work that is already done.
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {
  AI_DIR, ROOT, bold, dim, green, isWindows, readEnvFile, red, run, systemPython, venvPython, yellow,
} from './lib.mjs';

const ok = (text) => console.log(`  ${green('OK')}    ${text}`);
const warn = (text) => console.log(`  ${yellow('NOTE')}  ${text}`);
const fail = (text) => console.log(`  ${red('FAIL')}  ${text}`);
const step = (n, text) => console.log(`\n${bold(`[${n}/5] ${text}`)}`);
const problems = [];

// ---- 1. Node.js ----
step(1, 'Node.js');
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  fail(`Node.js ${process.versions.node} is too old. Install Node.js 20 or newer from https://nodejs.org and run this again.`);
  process.exit(1);
}
ok(`Node.js ${process.versions.node}`);

// ---- 2. .env ----
step(2, 'Environment file (.env)');
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  ok('.env already exists - left unchanged');
} else {
  const secret = () => crypto.randomBytes(32).toString('hex');
  const text = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8')
    .replace(/^(USER_JWT_SECRET|USER_REFRESH_SECRET|ADMIN_JWT_SECRET|INTERNAL_SERVICE_KEY)=.*$/gm, (_line, name) => `${name}=${secret()}`);
  fs.writeFileSync(envPath, text);
  ok('.env created from .env.example with new random secrets');
}
const env = readEnvFile(envPath);

// ---- 3. JavaScript packages ----
step(3, 'JavaScript packages (npm install) - this can take a few minutes the first time');
if (run('npm', ['install', '--no-audit', '--no-fund'])) {
  ok('packages installed for shared, both backends and both frontends');
} else {
  fail('npm install failed. Check your internet connection and the messages above, then run this again.');
  process.exit(1);
}

// ---- 4. Python packages for the AI service ----
step(4, 'AI recommendation service (Python)');
const python = systemPython();
if (!python) {
  warn('Python 3.10+ was not found. FlyWise still works: flight search falls back to its built-in scoring formula.');
  warn('To run the AI service, install Python from https://www.python.org/downloads/ (tick "Add python.exe to PATH") and run this again.');
  problems.push('Python not installed (optional): the AI service will not start.');
} else {
  if (!venvPython()) {
    console.log(dim(`  creating virtual environment with Python ${python.version} ...`));
    run(python.command, [...python.args, '-m', 'venv', '.venv'], { cwd: AI_DIR });
  }
  const venv = venvPython();
  if (venv && run(venv, ['-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '-r', 'requirements.txt'], { cwd: AI_DIR })) {
    ok(`Python ${python.version} virtual environment ready in services/ai-recommendation/.venv`);
  } else {
    fail('Could not install the Python packages. See the messages above.');
    problems.push('Python packages not installed: the AI service will not start (search still works without it).');
  }
}

// ---- 5. MongoDB ----
step(5, 'MongoDB');
const uri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017/flywise_db';
const reachable = await new Promise((resolve) => {
  if (uri.startsWith('mongodb+srv://')) { resolve(null); return; } // Atlas: nothing to probe locally
  const match = /^mongodb:\/\/(?:[^@/]+@)?([^:/,?]+)(?::(\d+))?/.exec(uri);
  if (!match) { resolve(false); return; }
  const socket = net.connect({ host: match[1], port: Number(match[2] || 27017), timeout: 2500 });
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('timeout', () => { socket.destroy(); resolve(false); });
  socket.once('error', () => resolve(false));
});
if (reachable === null) {
  ok('MONGODB_URI points at MongoDB Atlas (not checked from here)');
} else if (reachable) {
  ok(`MongoDB is answering at ${uri.replace(/\/\/[^@/]+@/, '//')}`);
} else {
  fail(`MongoDB is not answering at ${uri.replace(/\/\/[^@/]+@/, '//')}`);
  console.log('        Pick one way to get a database (details in docs/setup-guide.md):');
  console.log('          a) Install MongoDB Community Server - it then runs in the background as a service');
  console.log('          b) With Docker Desktop running:  npm run docker:db');
  console.log('          c) Create a free MongoDB Atlas cluster and put its connection string in .env as MONGODB_URI');
  problems.push('MongoDB is not running: the two backends cannot start until it is.');
}

// ---- Summary ----
console.log(`\n${bold('Setup finished.')}`);
if (problems.length) {
  console.log(yellow('Still to sort out:'));
  for (const problem of problems) console.log(`  - ${problem}`);
}
console.log(`
Next steps
  1. Start everything:        ${bold(isWindows ? 'start.bat   (or: npm run dev)' : 'npm run dev')}
  2. Add demo data (once):    ${bold('npm run seed:demo')}   ${dim("- needs MongoDB running; run it in a second terminal")}
  3. Open the traveller app:  http://localhost:5173
     Open the desk (admin):   http://localhost:5174
       desk login:  ${env.ADMIN_EMAIL || 'admin@flywise.local'}  /  ${env.ADMIN_PASSWORD || '(ADMIN_PASSWORD in .env)'}
`);
