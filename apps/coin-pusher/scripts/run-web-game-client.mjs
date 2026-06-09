import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const skillClientPath = path.join(
  repoRoot,
  '.codex',
  'skills',
  'develop-web-game',
  'scripts',
  'web_game_playwright_client.js',
);
const tempClientPath = path.join(appRoot, `.web-game-client.${process.pid}.mjs`);

function findSystemChromium() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function prepareClient() {
  if (!fs.existsSync(skillClientPath)) {
    throw new Error(`develop-web-game client not found: ${skillClientPath}`);
  }

  const executablePath = findSystemChromium();
  let source = fs.readFileSync(skillClientPath, 'utf8');
  source = source.replace(
    'headless: args.headless,',
    `executablePath: ${JSON.stringify(executablePath)} || undefined,\n    headless: args.headless,`,
  );
  fs.writeFileSync(tempClientPath, source, 'utf8');
}

function runClient() {
  const forwardedArgs = normalizeArgs(process.argv.slice(2));
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [tempClientPath, ...forwardedArgs], {
      cwd: appRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('exit', (code, signal) => {
      resolve(signal ? 1 : (code ?? 1));
    });
  });
}

function normalizeArgs(args) {
  const normalized = args[0] === '--' ? args.slice(1) : [...args];

  for (let index = 0; index < normalized.length - 1; index += 1) {
    if (normalized[index] !== '--actions-file') continue;
    const actionsFile = normalized[index + 1];
    if (path.isAbsolute(actionsFile)) continue;

    const appRelative = path.resolve(appRoot, actionsFile);
    if (fs.existsSync(appRelative)) continue;

    const repoRelative = path.resolve(repoRoot, actionsFile);
    if (fs.existsSync(repoRelative)) {
      normalized[index + 1] = path.relative(appRoot, repoRelative);
    }
  }

  return normalized;
}

try {
  prepareClient();
  process.exitCode = await runClient();
} finally {
  fs.rmSync(tempClientPath, { force: true });
}
