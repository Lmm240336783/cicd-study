import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://127.0.0.1:5173/';
const rolls = Number(process.argv.includes('--rolls')
  ? process.argv[process.argv.indexOf('--rolls') + 1]
  : 12);
const settleWaitMs = Number(process.argv.includes('--settle-wait-ms')
  ? process.argv[process.argv.indexOf('--settle-wait-ms') + 1]
  : 1500);
const maxAirborneMs = Number(process.argv.includes('--max-airborne-ms')
  ? process.argv[process.argv.indexOf('--max-airborne-ms') + 1]
  : 2000);

const browserCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  process.env.CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate));

function diffCounts(before = [], after = []) {
  const length = Math.max(before.length, after.length);
  return Array.from({ length }, (_, index) => (after[index] ?? 0) - (before[index] ?? 0));
}

function maxAbsDelta(before = [], after = [], key) {
  const length = Math.max(before.length, after.length);
  let max = 0;
  for (let index = 0; index < length; index += 1) {
    max = Math.max(max, Math.abs((after[index]?.[key] ?? 0) - (before[index]?.[key] ?? 0)));
  }
  return Number(max.toFixed(6));
}

const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const consoleMessages = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleMessages.push(message.text());
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.click('.mode-card.primary');
await page.waitForSelector('.shake-button');

const readDebug = () => {
  const raw = document.documentElement.dataset.diceDebug
    || sessionStorage.getItem('coin-pusher:dice-debug')
    || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

let lastRollId = await page.evaluate(() => window.__diceDebug?.rollId ?? 0);
const results = [];
let timedOut = false;

for (let rollIndex = 0; rollIndex < rolls; rollIndex += 1) {
  await page.click('.shake-button');
  const rollStartedAt = Date.now();
  const airborneStartedAt = new Map();
  let maxObservedAirborneMs = 0;
  let airborneViolation;

  while (Date.now() - rollStartedAt < 30000) {
    const currentDebug = await page.evaluate(readDebug);
    if (currentDebug.rollId > lastRollId && currentDebug.finishedAt) break;

    for (const state of currentDebug.diceStates ?? []) {
      if (!state.isUnsupportedAirborne) {
        airborneStartedAt.delete(state.dieIndex);
        continue;
      }

      if (!airborneStartedAt.has(state.dieIndex)) airborneStartedAt.set(state.dieIndex, Date.now());
      const duration = Date.now() - airborneStartedAt.get(state.dieIndex);
      maxObservedAirborneMs = Math.max(maxObservedAirborneMs, duration);
      if (duration > maxAirborneMs && !airborneViolation) {
        airborneViolation = {
          dieIndex: state.dieIndex,
          duration,
          state,
        };
      }
    }

    if (airborneViolation) break;
    await page.waitForTimeout(100);
  }

  if (airborneViolation) {
    const currentDebug = await page.evaluate(readDebug);
    results.push({
      roll: rollIndex + 1,
      rollId: currentDebug.rollId,
      airborneViolation,
      maxObservedAirborneMs,
      assistCounts: currentDebug.assistCounts,
      boundsCorrectionCounts: currentDebug.boundsCorrectionCounts,
      correctionMotionCounts: currentDebug.correctionMotionCounts,
      diceStates: currentDebug.diceStates,
    });
    break;
  }

  const finished = await page.waitForFunction((previousRollId) => {
    const raw = document.documentElement.dataset.diceDebug
      || sessionStorage.getItem('coin-pusher:dice-debug')
      || '{}';
    let debug = {};
    try {
      debug = JSON.parse(raw);
    } catch {
      return false;
    }
    return debug.rollId > previousRollId && Boolean(debug.finishedAt);
  }, lastRollId, { timeout: 30000 }).then(
    () => true,
    () => false,
  );

  if (!finished) {
    const currentDebug = await page.evaluate(readDebug);
    results.push({
      roll: rollIndex + 1,
      rollId: currentDebug.rollId,
      timedOut: true,
      assistCounts: currentDebug.assistCounts,
      boundsCorrectionCounts: currentDebug.boundsCorrectionCounts,
      correctionMotionCounts: currentDebug.correctionMotionCounts,
      diceStates: currentDebug.diceStates,
    });
    timedOut = true;
    break;
  }

  const atFinish = await page.evaluate(readDebug);
  lastRollId = atFinish.rollId;
  await page.waitForTimeout(settleWaitMs);
  const afterWait = await page.evaluate(readDebug);
  const unsupportedAfterWait = (afterWait.diceStates ?? [])
    .filter((state) => state.isUnsupportedAirborne)
    .map((state) => state.dieIndex);
  const boundsDelta = diffCounts(atFinish.boundsCorrectionCounts, afterWait.boundsCorrectionCounts);
  const correctionDelta = diffCounts(atFinish.correctionMotionCounts, afterWait.correctionMotionCounts);

  results.push({
    roll: rollIndex + 1,
    rollId: atFinish.rollId,
    boundsDelta,
    correctionDelta,
    maxHeightDelta: maxAbsDelta(atFinish.diceStates, afterWait.diceStates, 'height'),
    maxTopFaceDotDelta: maxAbsDelta(atFinish.diceStates, afterWait.diceStates, 'topFaceDot'),
    maxObservedAirborneMs,
    unsupportedAfterWait,
    maxLinearSpeedAfter: Number(Math.max(
      0,
      ...(afterWait.diceStates ?? []).map((state) => state.linearSpeed ?? 0),
    ).toFixed(6)),
    maxAngularSpeedAfter: Number(Math.max(
      0,
      ...(afterWait.diceStates ?? []).map((state) => state.angularSpeed ?? 0),
    ).toFixed(6)),
  });
}

const screenshotPath = path.join(os.tmpdir(), `coin-pusher-dice-drift-${Date.now()}.png`);
await page.screenshot({ path: screenshotPath });
await browser.close();

const failedRolls = results.filter((result) => (
  Boolean(result.airborneViolation)
  || (result.unsupportedAfterWait ?? []).length > 0
  || (result.correctionDelta ?? []).some((value) => value !== 0)
  || (result.maxHeightDelta ?? 0) > 0.002
  || (result.maxTopFaceDotDelta ?? 0) > 0.002
));

const payload = {
  ok: !timedOut && failedRolls.length === 0 && consoleMessages.length === 0,
  rolls,
  settleWaitMs,
  timedOut,
  failedRolls,
  results,
  consoleMessages,
  screenshotPath,
};

console.log(JSON.stringify(payload, null, 2));
process.exitCode = payload.ok ? 0 : 1;
