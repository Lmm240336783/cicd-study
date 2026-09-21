/* global window */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const appRoot = path.resolve(import.meta.dirname, '..');
const screenshotPath = path.join(os.tmpdir(), `coin-pusher-slot-${Date.now()}.png`);

const browserCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  process.env.CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate));

function waitForServer(timeoutMs = 20000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      const logText = devLogs.join('');
      const match = logText.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
      try {
        if (match) {
          const targetUrl = `http://127.0.0.1:${match[1]}/`;
          const response = await fetch(targetUrl);
          if (response.ok) {
            resolve(targetUrl);
            return;
          }
        }
      } catch {
        // Vite may still be booting.
      }

      try {
        const response = await fetch('http://127.0.0.1:5173/');
        if (response.ok && !logText.includes('Port 5173 is in use')) {
          resolve('http://127.0.0.1:5173/');
          return;
        }
      } catch {
        // Vite may still be booting.
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error('Timed out waiting for Vite dev server'));
        return;
      }

      setTimeout(tick, 250);
    };

    void tick();
  });
}

function startDevServer() {
  const viteBin = path.resolve(appRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  return spawn(process.execPath, [viteBin, '--host', '127.0.0.1'], {
    cwd: appRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const devServer = startDevServer();
const devLogs = [];
devServer.stdout.on('data', (chunk) => devLogs.push(String(chunk)));
devServer.stderr.on('data', (chunk) => devLogs.push(String(chunk)));

let browser;
try {
  const url = await waitForServer();
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const consoleMessages = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleMessages.push(message.text());
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /老虎机/ }).click();
  await page.waitForSelector('.slot-game-shell');
  const spinStates = [];
  for (let spinIndex = 0; spinIndex < 12; spinIndex += 1) {
    await page.getByRole('button', { name: /SPIN/ }).click();
    await page.evaluate(() => window.advanceTime?.(1000));
    await page.waitForFunction((expectedSpins) => {
      const state = JSON.parse(window.render_game_to_text?.() ?? '{}');
      return state.spinsPlayed === expectedSpins && !state.spinning;
    }, spinIndex + 1);

    const state = JSON.parse(await page.evaluate(() => window.render_game_to_text?.() ?? '{}'));
    spinStates.push(state);

    if (state.showCelebration) {
      await page.waitForSelector('.slot-win-overlay.visible');
      await page.locator('.slot-win-close').click();
    } else {
      const overlayVisible = await page.locator('.slot-win-overlay.visible').count();
      if (overlayVisible > 0) throw new Error('No-win spin unexpectedly showed celebration overlay');
    }
  }

  const state = spinStates.at(-1);
  const winningSpins = spinStates.filter((spinState) => (spinState.outcome?.coins ?? 0) > 0).length;
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const payload = {
    ok: consoleMessages.length === 0
      && state?.spinsPlayed === 12
      && state.outcome
      && state.grid?.length === 3
      && state.grid.every((row) => row.length === 5)
      && winningSpins > 0
      && winningSpins < spinStates.length,
    state,
    winningSpins,
    totalSpins: spinStates.length,
    consoleMessages,
    screenshotPath,
  };

  console.log(JSON.stringify(payload, null, 2));
  process.exitCode = payload.ok ? 0 : 1;
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    devLogs: devLogs.join(''),
    screenshotPath,
  }, null, 2));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  devServer.kill();
}
