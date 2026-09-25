// Multimodal browser lane — Playwright over the live stack (https://claw.local).
//
//   export QA_ADMIN_EMAIL=<admin> QA_ADMIN_PASSWORD='<admin password>'
//   export QA_MMUI_FIXTURES=<dir with qa-lighthouse-test.png + qa-clip.mp4>
//   export QA_MMUI_OUT=<evidence dir>
//   node scripts/qa-lab/multimodal-ui-matrix.mjs
//
// Scenarios 1–11 of the multimodal UI QA brief: composer media buttons, model
// picker capability badges, helper-vision delivery chip, attachment chip states,
// read aloud, chat image generation, free-plan gates, device matrix, RTL, axe,
// console + network errors. Every wait is bounded. Output: screenshots + report.json.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { chromium } from 'playwright';

import { api, apiLogin, ensureAccounts } from './multimodal-ui-accounts.mjs';

const require = createRequire(import.meta.url);
const ORIGIN = process.env.QA_ORIGIN ?? 'https://claw.local';
const FIX = process.env.QA_MMUI_FIXTURES ?? '.';
const OUT = process.env.QA_MMUI_OUT ?? 'mmui-evidence';
const SHOT_DIR = process.env.QA_MMUI_SHOTS ?? 'screenshots';
const SHOTS = path.join(OUT, SHOT_DIR);
fs.mkdirSync(SHOTS, { recursive: true });
const PNG = path.join(FIX, 'qa-lighthouse-test.png');
const MP4 = path.join(FIX, 'qa-clip.mp4');
const BLIND = { provider: 'OLLAMA', model: process.env.QA_BLIND_MODEL ?? 'gpt-oss:20b' };
const ONLY = (process.env.QA_MMUI_ONLY ?? '').split(',').filter(Boolean);
const want = (n) => ONLY.length === 0 || ONLY.includes(String(n));

const report = { startedAt: new Date().toISOString(), environment: {}, scenarios: {}, matrix: [], rtl: [], axe: null, console: [], network: [] };
const result = (id, status, detail) => {
  report.scenarios[id] = { status, ...detail };
  console.log(`[${id}] ${status} ${JSON.stringify(detail).slice(0, 400)}`);
};
const shot = async (page, name, full = false) => {
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(SHOTS, file), fullPage: full, timeout: 20000 });
  return `${SHOT_DIR}/${file}`;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function instrument(page, who) {
  page.on('console', (m) => {
    if (m.type() === 'error') report.console.push({ who, url: page.url().replace(ORIGIN, ''), text: m.text().slice(0, 300) });
  });
  page.on('pageerror', (e) => report.console.push({ who, url: page.url().replace(ORIGIN, ''), text: `pageerror: ${e.message.slice(0, 300)}` }));
  page.on('requestfailed', (r) => {
    const err = r.failure()?.errorText ?? '';
    if (/ERR_ABORTED/.test(err)) return; // navigations / cancelled fetches
    report.network.push({ who, method: r.method(), url: r.url().replace(ORIGIN, '').split('?')[0], error: err });
  });
  page.on('response', (r) => {
    if (r.status() >= 400) report.network.push({ who, method: r.request().method(), url: r.url().replace(ORIGIN, '').split('?')[0], status: r.status() });
  });
}

async function uiLogin(browser, account, who) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  instrument(page, who);
  await page.goto(`${ORIGIN}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', account.email);
  await page.fill('#password', account.password);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
  return { ctx, page };
}

async function thread(token, body) {
  const r = await api('POST', '/chat-threads', token, { title: 'QA multimodal UI', ...body });
  if (!r.json?.id) throw new Error(`create thread → ${r.status}`);
  return r.json.id;
}

async function lastAssistantDelivery(token, threadId) {
  const r = await api('GET', `/chat-messages/thread/${threadId}?limit=20`, token);
  const rows = Array.isArray(r.json) ? r.json : (r.json?.data ?? r.json?.items ?? []);
  const a = rows.filter((m) => m.role === 'ASSISTANT').pop();
  return (a?.metadata?.fileDelivery ?? []).map((x) => ({ mode: x.mode, reason: x.reason, helper: x.helperModel }));
}

async function openThread(page, id, locale = 'en') {
  await page.goto(`${ORIGIN}/${locale}/chat/${id}`, { waitUntil: 'domcontentloaded' });
  await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 30000 });
  await sleep(1500);
}

const speechActions = (page) => page.locator('[data-testid="message-speech-action"]');

/**
 * Composer attachment state as the user sees it: an uploading placeholder tile,
 * a tile with a status line (processing / failed …), a failure chip, or a
 * plain tile (ready — the status line is omitted once a file is simply ready).
 */
async function composerAttachmentState(page) {
  return page.evaluate(() => {
    const pending = document.querySelectorAll('[data-testid="composer-pending-attachment-tile"]').length;
    const chips = [...document.querySelectorAll('[data-testid="composer-attachment-chip"]')].map((c) => `${c.dataset.state}:${c.textContent.trim().slice(0, 80)}`);
    const tiles = [...document.querySelectorAll('[data-testid="composer-attachment-tile"]')];
    const statuses = tiles.map((t) => t.querySelector('[data-testid="composer-attachment-status"]')?.textContent.trim() ?? null);
    let state = 'NONE';
    if (chips.length > 0) state = `CHIP ${chips.join(' | ')}`;
    else if (pending > 0) state = 'UPLOADING (pending tile)';
    else if (tiles.length > 0 && statuses.some((s) => s !== null)) state = `STATUS "${statuses.filter(Boolean).join(' | ')}"`;
    else if (tiles.length > 0) state = 'READY (tile, no status line)';
    return state;
  });
}

async function attach(page, file, timeoutMs = 90000, onState) {
  await page.locator('input[type="file"]').first().setInputFiles(file);
  const states = [];
  const deadline = Date.now() + timeoutMs;
  let s = null;
  while (Date.now() < deadline) {
    s = await composerAttachmentState(page).catch(() => null);
    if (s && states[states.length - 1] !== s) {
      states.push(s);
      if (onState) await onState(s, states.length);
    }
    if (s && (s.startsWith('READY') || s.startsWith('CHIP'))) break;
    await sleep(250);
  }
  return { states, final: s };
}

/** Send and wait for a NEW assistant reply to finish (speech action appears + text stable). */
async function sendAndWait(page, text, timeoutMs = 240000) {
  const before = await speechActions(page).count();
  await page.locator('textarea').first().fill(text);
  const send = page.locator('button[aria-label="Send message"], button[type="submit"][aria-label]').last();
  await send.waitFor({ state: 'visible' });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline && (await send.isDisabled())) await sleep(300);
  await send.click();
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if ((await speechActions(page).count()) > before) break;
    await sleep(1000);
  }
  if ((await speechActions(page).count()) <= before) return false;
  // settle: wait until the transcript text stops changing
  let last = '';
  for (let i = 0; i < 30; i += 1) {
    const now = await page.locator('main').innerText().catch(() => '');
    if (now === last) break;
    last = now;
    await sleep(1500);
  }
  return true;
}

async function checkNoRawKeys(page) {
  const text = await page.locator('main').innerText().catch(() => '');
  return (text.match(/\b(chat|compare|mediaUi|common)\.[a-z]+\.[a-zA-Z.]+\b/g) ?? []).slice(0, 5);
}

async function layoutChecks(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const inView = (el) => {
      if (!el) return { present: false };
      const r = el.getBoundingClientRect();
      const visible = r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      return { present: true, visible, inViewport: visible && r.left >= -1 && r.right <= vw + 1 && r.top >= -1 && r.bottom <= vh + 1, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] };
    };
    const send = document.querySelector('button[aria-label="Send message"]') ?? document.querySelector('button[aria-label="إرسال الرسالة"]') ?? [...document.querySelectorAll('form button[type="submit"]')].pop();
    const rec = document.querySelector('[data-testid="voice-video-recorder-audio"]');
    const imgs = [...document.querySelectorAll('main img[class*="max-h-[512px]"]')].filter((i) => i.naturalWidth > 1 || i.width > 1);
    const img = imgs[imgs.length - 1];
    let imgFit = null;
    if (img) {
      const r = img.getBoundingClientRect();
      const pr = img.parentElement.getBoundingClientRect();
      imgFit = { imgW: Math.round(r.width), containerW: Math.round(pr.width), fits: r.width <= pr.width + 1 && r.right <= vw + 1 };
    }
    const se = document.scrollingElement;
    return {
      innerWidth: vw,
      scrollWidth: se.scrollWidth,
      overflowPx: Math.max(0, se.scrollWidth - vw),
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      send: inView(send),
      record: inView(rec),
      chip: inView(document.querySelector('[data-testid="composer-attachment-tile"]')),
      player: inView(document.querySelector('[data-testid="message-speech-player"]')),
      image: imgFit,
    };
  });
}

async function scrollComposerAndImage(page) {
  await page.evaluate(() => {
    const img = [...document.querySelectorAll('main img[class*="max-h-[512px]"]')].pop();
    if (img) img.scrollIntoView({ block: 'center' });
  });
}

async function openPlayer(page, index) {
  const actions = speechActions(page);
  const n = await actions.count();
  if (n === 0) return { opened: false };
  const target = actions.nth(index < 0 ? n + index : index);
  await target.scrollIntoViewIfNeeded();
  await target.click();
  const audio = page.locator('[data-testid="message-speech-audio"]').first();
  await audio.waitFor({ state: 'attached', timeout: 90000 }).catch(() => null);
  const src = (await audio.count()) > 0 ? await audio.getAttribute('src') : null;
  return { opened: true, src };
}

const browser = await chromium.launch();
try {
  const accounts = await ensureAccounts();
  const paidTok = await apiLogin(accounts.paid.email, accounts.paid.password);
  const freeTok = await apiLogin(accounts.free.email, accounts.free.password);
  report.environment.accounts = { paidPlan: accounts.plan, paidTopupHttp: accounts.topupStatus, emails: 'qa-mmui-* throwaway (passwords never printed)' };

  const paid = await uiLogin(browser, accounts.paid, 'paid');
  const p = paid.page;

  // ── Environment proof + 1 + 2 ──────────────────────────────────────────────
  const tHaiku = await thread(paidTok, { routingMode: 'MANUAL_MODEL', preferredProvider: 'ANTHROPIC', preferredModel: 'claude-haiku-4-5-20251001' });
  await openThread(p, tHaiku);
  if (want(1)) {
    const a = p.locator('[data-testid="voice-video-recorder-audio"]');
    const v = p.locator('[data-testid="voice-video-recorder-video"]');
    const d = {
      model: (await p.locator('button', { hasText: 'Claude Haiku 4.5' }).first().waitFor({ timeout: 15000 }).then(() => 'Claude Haiku 4.5 (selected in composer)').catch(() => 'unknown')),
      voiceEnabled: await a.isEnabled(),
      voiceAria: await a.getAttribute('aria-label'),
      voiceTitle: await a.getAttribute('title'),
      videoEnabled: await v.isEnabled(),
      videoAria: await v.getAttribute('aria-label'),
      videoTitle: await v.getAttribute('title'),
      voiceOpacityClass: ((await a.getAttribute('class')) ?? '').split(' ').includes('opacity-50'),
    };
    d.screenshot = await shot(p, '01-composer-voice-video-claude-haiku-1440');
    result(1, d.voiceEnabled && d.videoEnabled && d.voiceAria && d.voiceTitle && d.videoAria && !d.voiceOpacityClass ? 'PASS' : 'FAIL', d);
  }
  if (want(2)) {
    await p.locator('button', { hasText: 'Claude Haiku 4.5' }).first().click();
    const search = p.locator('[cmdk-input]').last();
    await search.waitFor({ state: 'visible', timeout: 10000 });
    const rowBadges = async (q, label) => {
      await search.fill(q);
      await sleep(1200);
      return p.$$eval('[cmdk-item]', (els, want) => {
        const row = els.find((e) => (e.textContent ?? '').trim().startsWith(want) && !(e.textContent ?? '').includes(`${want} `) && !(e.textContent ?? '').includes(`${want}-`));
        const pick = row ?? els.find((e) => (e.textContent ?? '').includes(want));
        if (!pick) return null;
        return {
          text: (pick.textContent ?? '').trim().slice(0, 80),
          badges: [...pick.querySelectorAll('[data-testid^="model-capability-badge-"]')].map((b) => b.getAttribute('data-testid').replace('model-capability-badge-', '')),
          titles: [...pick.querySelectorAll('[data-testid^="model-capability-badge-"]')].map((b) => b.getAttribute('title')),
        };
      }, label);
    };
    const gem = await rowBadges('gemini-2.5-flash', 'Gemini 2.5 Flash');
    const s1 = await shot(p, '02-model-picker-gemini-2.5-flash-badges');
    const gpt = await rowBadges('gpt-4.1-mini', 'GPT 4.1 Mini');
    const gptAlt = gpt;
    const s2 = await shot(p, '02-model-picker-gpt-4.1-mini-badges');
    await p.keyboard.press('Escape');
    const gemOk = gem && gem.badges.includes('VISION') && gem.badges.includes('VIDEO_INPUT');
    const gptOk = gptAlt && gptAlt.badges.includes('VISION') && !gptAlt.badges.includes('VIDEO_INPUT');
    report.environment.newCodeProof = { capabilityBadgesRendered: Boolean(gem?.badges?.length), gemini: gem };
    result(2, gemOk && gptOk ? 'PASS' : 'FAIL', { gemini: gem, gpt41mini: gptAlt, screenshots: [s1, s2] });
  }

  // ── 3 + 4 + 5: blind model thread ───────────────────────────────────────────
  const tBlind = await thread(paidTok, { routingMode: 'MANUAL_MODEL', preferredProvider: BLIND.provider, preferredModel: BLIND.model });
  if (want(3) || want(5)) {
    await openThread(p, tBlind);
    const up = await attach(p, PNG);
    const ok = await sendAndWait(p, 'What is in this image?');
    const chip = p.locator('[data-testid="attachment-delivery-chip"]').last();
    await chip.waitFor({ state: 'visible', timeout: 30000 }).catch(() => null);
    const d = { model: `${BLIND.provider}/${BLIND.model}`, uploadStates: up.states, replyRendered: ok };
    if ((await chip.count()) > 0) {
      d.chipTitle = await chip.getAttribute('title');
      d.chipAria = await chip.getAttribute('aria-label');
      d.badges = await chip.locator('[data-testid^="attachment-delivery-badge-"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid')}: ${e.textContent.trim()}`));
    }
    d.rawKeysOnPage = await checkNoRawKeys(p);
    d.backendFileDelivery = await lastAssistantDelivery(paidTok, tBlind);
    d.filesBadge = await p.locator('main [aria-label^="Files:"]').last().getAttribute('aria-label').catch(() => null);
    d.screenshot = await shot(p, '03-helper-vision-delivery-chip-1440');
    if (want(3)) {
      const described = (d.badges ?? []).some((b) => /described/.test(b) && /Described by helper/.test(b));
      const localized = d.chipTitle && !/compare\.delivery/.test(d.chipTitle);
      result(3, ok && described && localized && d.rawKeysOnPage.length === 0 ? 'PASS' : 'FAIL', d);
    }
    if (want(5) && ok) {
      const speechReqs = [];
      const onReq = (r) => {
        if (/\/chat-messages\/[^/]+\/speech/.test(r.url())) speechReqs.push(`${r.method()} ${r.url().replace(ORIGIN, '').split('?')[0]}`);
      };
      p.on('request', onReq);
      const speechResponses = [];
      const onRes = async (r) => {
        if (/\/chat-messages\/[^/]+\/speech$/.test(r.url().split('?')[0]) && r.request().method() === 'POST') {
          const body = await r.json().catch(() => null);
          speechResponses.push({ status: r.status(), cached: body?.cached ?? null, fileIdTail: String(body?.fileId ?? '').slice(-6) });
        }
      };
      p.on('response', onRes);
      const consoleBefore = report.console.length;
      const first = await openPlayer(p, -1);
      const audio = p.locator('[data-testid="message-speech-audio"]').first();
      let meta = null;
      if ((await audio.count()) > 0) {
        meta = await audio.evaluate(
          (el) =>
            new Promise((resolve) => {
              const done = () => resolve({ readyState: el.readyState, duration: el.duration, error: el.error ? el.error.code : null });
              if (el.readyState >= 1) done();
              else {
                el.addEventListener('loadedmetadata', done, { once: true });
                el.addEventListener('error', done, { once: true });
                setTimeout(done, 20000);
              }
            }),
        );
      }
      const playerErr = await p.locator('[data-testid="message-speech-player"] [role="alert"]').allInnerTexts().catch(() => []);
      const s1 = await shot(p, '05-read-aloud-player-1440');
      const afterFirst = speechReqs.length;
      const action = speechActions(p).last();
      await action.click(); // stop / close
      await sleep(1500);
      const closedAfterSecond = (await p.locator('[data-testid="message-speech-player"]').count()) === 0;
      const afterSecond = speechReqs.length;
      await action.click(); // reopen — replay must come from cache
      await sleep(4000);
      const afterThird = speechReqs.length;
      p.off('request', onReq);
      p.off('response', onRes);
      const d5 = {
        src: first.src ? first.src.slice(0, 12) : null,
        srcIsBlob: Boolean(first.src && first.src.startsWith('blob:')),
        audioMeta: meta,
        playerError: playerErr,
        speechRequests: speechReqs,
        speechResponses,
        requestsAfterClick1: afterFirst,
        requestsAfterClick2: afterSecond,
        requestsAfterClick3: afterThird,
        playerClosedOnSecondClick: closedAfterSecond,
        consoleErrorsDuring: report.console.slice(consoleBefore),
        screenshot: s1,
      };
      const pass = d5.srcIsBlob && meta && meta.error === null && meta.readyState >= 1 && afterSecond === afterFirst && d5.consoleErrorsDuring.length === 0;
      result(5, pass ? 'PASS' : 'FAIL', d5);
    } else if (want(5)) result(5, 'NOT RUN', { reason: 'no assistant reply in scenario 3 thread' });
  }

  if (want(4)) {
    await openThread(p, tBlind);
    const shots = [];
    const up = await attach(p, MP4, 180000, async (s, n) => {
      if (shots.length < 4) shots.push(await shot(p, `04-video-attachment-state-${n}-${s.split(' ')[0].toLowerCase()}`));
    });
    const sawProcessing = up.states.some((s) => s.startsWith('STATUS'));
    const ready = (up.final ?? '').startsWith('READY');
    // Backend truth at the moment the UI said Ready, then after the video job had time to run.
    const fileProbe = async () => {
      const r = await api('GET', '/files?limit=20', paidTok);
      const rows = Array.isArray(r.json) ? r.json : (r.json?.data ?? r.json?.items ?? []);
      const f = rows.filter((x) => x.filename === 'qa-clip.mp4').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
      if (!f) return { found: false, http: r.status };
      const one = await api('GET', `/files/${f.id}`, paidTok);
      return { found: true, ingestionStatus: one.json?.ingestionStatus, extractedTextPrefix: String(one.json?.extractedText ?? '').slice(0, 40), media: Boolean(one.json?.extractionMetadata?.media) };
    };
    const atReady = await fileProbe();
    let later = null;
    for (let i = 0; i < 20; i += 1) {
      await sleep(3000);
      later = await fileProbe();
      if (later.media || !later.extractedTextPrefix.startsWith('[Video file:')) break;
    }
    result(4, ready && sawProcessing ? 'PASS' : 'FAIL', { states: up.states, final: up.final, backendAtUiReady: atReady, backendLater: later, screenshots: shots });
    await p.locator('[data-testid="composer-attachment-remove"]').first().click().catch(() => null);
  }

  // ── 6: image generation (AUTO) ─────────────────────────────────────────────
  const tImg = await thread(paidTok, { routingMode: 'AUTO' });
  if (want(6) || want(8) || want(9) || want(10)) {
    await openThread(p, tImg);
    const textOk = await sendAndWait(p, 'Reply with one short sentence about lighthouses.', 180000);
    await p.locator('textarea').first().fill('Generate an image of a lighthouse at dusk');
    await p.locator('button[aria-label="Send message"]').click();
    const progressShots = [];
    const stages = [];
    const deadline = Date.now() + 300000;
    let done = false;
    while (Date.now() < deadline) {
      const imgN = await p.locator('main img[class*="max-h-[512px]"][src^="blob:"]').count();
      if (imgN > 0) {
        done = true;
        break;
      }
      const notice = await p.locator('[data-testid="plan-feature-notice"]').count();
      if (notice > 0) break;
      const stageText = await p.locator('main').innerText().then((t) => (t.match(/(Queued|Generating|Processing|Pending|Uploading|Storing|Loading image)[^\n]{0,60}/i) ?? [null])[0]).catch(() => null);
      if (stageText && stages[stages.length - 1] !== stageText) {
        stages.push(stageText);
        if (progressShots.length < 1) progressShots.push(await shot(p, '06-image-generation-progress'));
      }
      await sleep(2000);
    }
    const s1 = await shot(p, '06-image-generation-completed');
    let afterReload = false;
    if (done) {
      await p.reload({ waitUntil: 'domcontentloaded' });
      afterReload = await p.locator('main img[class*="max-h-[512px]"][src^="blob:"]').first().waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false);
    }
    const s2 = await shot(p, '06-image-generation-after-refresh');
    if (want(6)) result(6, done && afterReload ? 'PASS' : 'FAIL', { precedingTextReply: textOk, stages, completed: done, renderedAfterRefresh: afterReload, planNotice: await p.locator('[data-testid="plan-feature-notice"]').count(), screenshots: [...progressShots, s1, s2] });
  }

  // ── 8: device matrix ───────────────────────────────────────────────────────
  const viewports = [
    ['mobile', 360, 740], ['mobile', 390, 844], ['mobile', 430, 932],
    ['mobile', 740, 360], ['mobile', 844, 390], ['mobile', 932, 430],
    ['tablet', 768, 1024], ['tablet', 820, 1180], ['tablet', 1024, 1366],
    ['tablet', 1024, 768], ['tablet', 1180, 820], ['tablet', 1366, 1024],
    ['desktop', 1280, 800], ['desktop', 1440, 900], ['desktop', 1920, 1080],
  ];
  const prepMedia = async (locale) => {
    await p.setViewportSize({ width: 1440, height: 900 });
    await openThread(p, tImg, locale);
    await p.locator('main img[class*="max-h-[512px]"]').first().waitFor({ state: 'visible', timeout: 60000 }).catch(() => null);
    const player = await openPlayer(p, 0);
    await p.locator('[data-testid="message-speech-player"]').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => null);
    const up = await attach(p, PNG, 60000);
    return { player, chipState: up.final };
  };
  const matrixPass = (c) => c.overflowPx === 0 && c.send.visible && c.send.inViewport && c.record.visible && c.record.inViewport && (c.image === null || c.image.fits);
  if (want(8)) {
    const prep = await prepMedia('en');
    report.matrixPrep = prep;
    for (const [platform, w, h] of viewports) {
      await p.setViewportSize({ width: w, height: h });
      await sleep(900);
      await scrollComposerAndImage(p);
      const c = await layoutChecks(p);
      const orient = w > h ? 'landscape' : 'portrait';
      const file = await shot(p, `08-matrix-${platform}-${w}x${h}-${orient}`);
      report.matrix.push({ platform, size: `${w}x${h}`, orientation: orient, pass: matrixPass(c), ...c, screenshot: file });
      console.log(`[8] ${w}x${h} overflow=${c.overflowPx} send=${c.send.inViewport} rec=${c.record.inViewport} img=${JSON.stringify(c.image)} chip=${c.chip.visible} player=${c.player.visible}`);
    }
    const fails = report.matrix.filter((m) => !m.pass);
    result(8, fails.length === 0 ? 'PASS' : 'FAIL', { failing: fails.map((f) => f.size) });
  }

  // ── 9: RTL ─────────────────────────────────────────────────────────────────
  if (want(9)) {
    // The saved preference (PATCH 200) did not switch an already-signed-in tab, so use the header menu, as a user would.
    await p.setViewportSize({ width: 1440, height: 900 });
    await openThread(p, tImg);
    await p.locator('button[aria-label*="Select language"]').first().click();
    await p.locator('[role="menuitem"]').filter({ hasText: /^ar/i }).first().click();
    await p.waitForFunction(() => document.documentElement.dir === 'rtl', null, { timeout: 20000 }).catch(() => null);
    report.environment.rtlSwitch = await p.evaluate(() => ({ url: location.pathname, dir: document.documentElement.dir, lang: document.documentElement.lang }));
    const prep = await prepMedia('ar');
    for (const [platform, w, h] of [['mobile', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 900]]) {
      await p.setViewportSize({ width: w, height: h });
      await sleep(900);
      await scrollComposerAndImage(p);
      const c = await layoutChecks(p);
      const file = await shot(p, `09-rtl-ar-${platform}-${w}x${h}`);
      report.rtl.push({ platform, size: `${w}x${h}`, pass: matrixPass(c) && c.dir === 'rtl', ...c, screenshot: file });
      console.log(`[9] ${w}x${h} dir=${c.dir} overflow=${c.overflowPx} send=${c.send.inViewport} rec=${c.record.inViewport}`);
    }
    await api('PATCH', '/users/me/preferences', paidTok, { languagePreference: 'EN' }).catch(() => null);
    result(9, report.rtl.every((r) => r.pass) ? 'PASS' : 'FAIL', { prep, rows: report.rtl.map((r) => ({ size: r.size, dir: r.dir, overflowPx: r.overflowPx, pass: r.pass })) });
  }

  // ── 10: axe ────────────────────────────────────────────────────────────────
  if (want(10)) {
    let axePath = null;
    try {
      axePath = require.resolve('axe-core/axe.min.js');
    } catch {
      axePath = null;
    }
    if (!axePath) result(10, 'NOT RUN', { reason: 'axe-core not resolvable from node_modules' });
    else {
      await prepMedia('en');
      await p.addScriptTag({ path: axePath });
      const axe = await p.evaluate(async () => {
        const r = await window.axe.run(document, { resultTypes: ['violations'] });
        return { version: window.axe.version, violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })) };
      });
      report.axe = axe;
      const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      result(10, serious.length === 0 ? 'PASS' : 'FAIL', { axeVersion: axe.version, seriousOrCritical: serious.map((v) => `${v.id}(${v.impact})x${v.count}`), all: axe.violations.map((v) => `${v.id}(${v.impact})x${v.count}`) });
    }
  }
  // ── A: per-file chips on Compare + a lab page ─────────────────────────────
  if (want('A')) {
    const pages = {};
    for (const [name, route] of [['compare', '/en/chat/compare'], ['consensus', '/en/chat/consensus']]) {
      await p.setViewportSize({ width: 1440, height: 900 });
      await p.goto(`${ORIGIN}${route}`, { waitUntil: 'domcontentloaded' });
      if (name === 'compare') {
        // The composer (and its file picker) appears only after 2+ models are selected.
        for (const label of ['Claude Haiku 4.5', 'Gemini 2.5 Flash']) {
          await p.getByText(label, { exact: true }).first().click({ timeout: 20000 }).catch(() => null);
          await sleep(400);
        }
      }
      const input = p.locator('input[type="file"]').first();
      const hasInput = await input.waitFor({ state: 'attached', timeout: 30000 }).then(() => true).catch(() => false);
      if (!hasInput) {
        pages[name] = { status: 'NOT RUN', reason: 'no file input on page' };
        continue;
      }
      await sleep(1500);
      const multiple = await input.evaluate((e) => e.multiple);
      const timeline = [];
      let countBadge = false;
      const shots = [];
      if (multiple) await input.setInputFiles([PNG, MP4]);
      else {
        await input.setInputFiles(PNG);
        await sleep(300);
        await p.locator('input[type="file"]').first().setInputFiles(MP4);
      }
      const deadline = Date.now() + 120000;
      let last = '';
      while (Date.now() < deadline) {
        const snap = await p.evaluate(() => {
          const pend = [...document.querySelectorAll('[data-testid="composer-pending-attachment-tile"]')].map((t) => `UPLOADING:${t.getAttribute('title') ?? t.textContent.trim().slice(0, 30)}`);
          const tiles = [...document.querySelectorAll('[data-testid="composer-attachment-tile"]')].map((t) => {
            const st = t.querySelector('[data-testid="composer-attachment-status"]')?.textContent.trim();
            return `${(t.getAttribute('title') ?? '').slice(0, 30)}=${st ? st.split('—')[0].trim() : 'READY'}`;
          });
          const chips = [...document.querySelectorAll('[data-testid="composer-attachment-chip"]')].map((c) => `CHIP:${c.dataset.state}`);
          const badge = /Uploading\s*\(\d+\)/.test(document.body.innerText);
          return { key: [...pend, ...tiles, ...chips].join(' | '), badge, tiles: tiles.length, pend: pend.length };
        });
        countBadge = countBadge || snap.badge;
        if (snap.key !== last) {
          timeline.push(snap.key);
          last = snap.key;
          if (shots.length < 3) shots.push(await shot(p, `A-${name}-chips-${timeline.length}`));
        }
        if (snap.pend === 0 && snap.tiles >= 2 && !/Processing|Uploading/i.test(snap.key)) break;
        await sleep(250);
      }
      shots.push(await shot(p, `A-${name}-chips-final`));
      const sawProcessing = timeline.some((k) => /Processing/i.test(k));
      const sawUploading = timeline.some((k) => /UPLOADING/.test(k));
      const ready = /READY.*READY|=READY/.test(last) && !/Processing|UPLOADING|CHIP/.test(last);
      pages[name] = { multipleInput: multiple, timeline, countBadgeSeen: countBadge, sawUploading, sawProcessing, ready, screenshots: shots, status: ready && !countBadge && sawProcessing ? 'PASS' : 'FAIL' };
    }
    result('A', Object.values(pages).every((x) => x.status === 'PASS') ? 'PASS' : 'FAIL', pages);
  }

  // ── B: cancellation (read aloud, image generation, video processing) ─────
  if (want('B')) {
    const ledger = async () => {
      const r = await api('GET', '/credit/me/ledger?limit=100', paidTok);
      return r.json?.entries ?? [];
    };
    const newEntries = (before, after) => after.filter((e) => !before.some((b) => b.id === e.id)).map((e) => `${e.kind}/${e.surface ?? '-'}/${e.amountMicroUsd}`);
    const out = {};
    // B1 read aloud: pending stop
    {
      const t = await thread(paidTok, { routingMode: 'MANUAL_MODEL', preferredProvider: BLIND.provider, preferredModel: BLIND.model });
      await p.setViewportSize({ width: 1440, height: 900 });
      await openThread(p, t);
      const ok = await sendAndWait(p, 'Write about 500 words on the history of lighthouses, in plain paragraphs.', 240000);
      const avail = await api('GET', '/chat-messages/speech/availability', paidTok);
      const r = await api('GET', `/chat-messages/thread/${t}?limit=20`, paidTok);
      const rows = Array.isArray(r.json) ? r.json : (r.json?.data ?? r.json?.items ?? []);
      const msg = rows.filter((m) => m.role === 'ASSISTANT').pop();
      const before = await ledger();
      const reqs = [];
      const onReq = (q) => { if (/\/speech(\/cancel)?$/.test(q.url().split('?')[0]) && q.method() === 'POST') reqs.push(`${q.method()} ${q.url().split('/api/v1')[1]} @${Date.now()}`); };
      const resps = [];
      const onRes = (s) => { if (/\/speech(\/cancel)?$/.test(s.url().split('?')[0]) && s.request().method() === 'POST') resps.push(`${s.status()} ${s.url().split('/api/v1')[1]} @${Date.now()}`); };
      p.on('request', onReq);
      p.on('response', onRes);
      const act = speechActions(p).last();
      await act.click();
      await sleep(400);
      const statusAtStop = await act.getAttribute('data-status');
      await act.click();
      const stopShot = await shot(p, 'B1-read-aloud-stop-pending');
      await sleep(8000);
      let state = await api('GET', `/chat-messages/${msg?.id}/speech`, paidTok);
      const s1 = state.json;
      await sleep(15000);
      state = await api('GET', `/chat-messages/${msg?.id}/speech`, paidTok);
      p.off('request', onReq);
      p.off('response', onRes);
      const after = await ledger();
      const segs0 = s1?.segments?.length ?? null;
      const segs1 = state.json?.segments?.length ?? null;
      const d = { replyRendered: ok, availability: avail.json, statusAtStop, requests: reqs, responses: resps, stateAfter8s: { status: s1?.status, segments: segs0, errorCode: s1?.errorCode }, stateAfter23s: { status: state.json?.status, segments: segs1, total: state.json?.totalSegments }, ledgerNew: newEntries(before, after), screenshot: stopShot };
      const cancelledBeforeAnswer = reqs.some((x) => x.includes('/speech/cancel'));
      const noConsumption = !d.ledgerNew.some((x) => x.startsWith('CONSUMPTION'));
      if (avail.json?.available === false) d.status = 'NOT RUN';
      else d.status = cancelledBeforeAnswer && state.json?.status === 'CANCELLED' && segs0 === segs1 && noConsumption ? 'PASS' : 'FAIL';
      out.readAloud = d;
    }
    // B2 image generation cancel
    {
      const t = await thread(paidTok, { routingMode: 'AUTO' });
      await openThread(p, t);
      const imgsBefore = await api('GET', '/images?limit=20', paidTok);
      const before = await ledger();
      await p.locator('textarea').first().fill('Generate an image of a red kite over green hills');
      await p.locator('button[aria-label="Send message"]').click();
      const cancel = p.locator('[data-testid="image-generation-cancel"]').first();
      const seen = await cancel.waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false);
      const d = { cancelButtonSeen: seen };
      if (seen) {
        await cancel.click();
        d.cancelledCard = await p.locator('[data-testid="image-generation-cancelled"]').first().waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false);
        d.cancelledText = d.cancelledCard ? await p.locator('[data-testid="image-generation-cancelled"]').first().innerText() : null;
        d.screenshot = await shot(p, 'B2-image-generation-cancelled');
        await sleep(20000);
        const imgsAfter = await api('GET', '/images?limit=20', paidTok);
        const rowsB = imgsBefore.json?.data ?? [];
        const rowsA = imgsAfter.json?.data ?? [];
        const fresh = rowsA.filter((x) => !rowsB.some((y) => y.id === x.id));
        d.newGenerations = fresh.map((x) => `${x.status}${x.supersededById || x.retryOfId || x.parentGenerationId ? ' (linked)' : ''}`);
        const after = await ledger();
        d.ledgerNew = newEntries(before, after);
        d.status = d.cancelledCard && fresh.length === 1 && fresh[0].status === 'CANCELLED' && !d.ledgerNew.some((x) => x.startsWith('CONSUMPTION')) ? 'PASS' : 'FAIL';
      } else {
        d.screenshot = await shot(p, 'B2-image-generation-no-cancel');
        d.status = 'FAIL';
      }
      out.imageGeneration = d;
    }
    // B3 video processing stop
    {
      const t = await thread(paidTok, { routingMode: 'MANUAL_MODEL', preferredProvider: BLIND.provider, preferredModel: BLIND.model });
      await openThread(p, t);
      const before = await ledger();
      await p.locator('input[type="file"]').first().setInputFiles(path.join(FIX, 'qa-clip-60s.mp4'));
      const stop = p.locator('[data-testid="composer-attachment-cancel-processing"]').first();
      const seen = await stop.waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false);
      const d = { stopButtonSeen: seen };
      if (seen) {
        d.stopLabel = await stop.innerText();
        await stop.click();
        const deadline = Date.now() + 60000;
        let st = null;
        while (Date.now() < deadline) {
          st = await composerAttachmentState(p);
          if (/cancel/i.test(st)) break;
          await sleep(500);
        }
        d.chipState = st;
        d.screenshot = await shot(p, 'B3-video-processing-cancelled');
        const r = await api('GET', '/files?limit=20', paidTok);
        const rows = Array.isArray(r.json) ? r.json : (r.json?.data ?? r.json?.items ?? []);
        const f = rows.filter((x) => x.filename === 'qa-clip-60s.mp4').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
        const one = f ? await api('GET', `/files/${f.id}`, paidTok) : null;
        d.file = one ? { ingestionStatus: one.json?.ingestionStatus, extractionError: one.json?.extractionError } : null;
        await sleep(10000);
        const after = await ledger();
        d.ledgerNew = newEntries(before, after);
        d.status = /cancel/i.test(st ?? '') && d.file?.ingestionStatus === 'FAILED' && /CANCEL/i.test(d.file?.extractionError ?? '') && !d.ledgerNew.some((x) => x.startsWith('CONSUMPTION')) ? 'PASS' : 'FAIL';
      } else {
        d.chipState = await composerAttachmentState(p);
        d.screenshot = await shot(p, 'B3-video-no-stop-button');
        d.status = 'FAIL';
      }
      out.videoProcessing = d;
    }
    const sts = Object.values(out).map((x) => x.status);
    result('B', sts.every((x) => x === 'PASS') ? 'PASS' : sts.includes('FAIL') ? 'FAIL' : 'PARTIAL', out);
  }

  // ── C: phone overlap (launcher expanded + jump-to-latest vs transcript text) ─
  if (want('C')) {
    const overlap = async () =>
      p.evaluate(() => {
        const rects = (el) => (el ? [el.getBoundingClientRect()] : []);
        const overlays = [
          ...[...document.querySelectorAll('[data-feedback-launcher]')].flatMap((e) => [...e.querySelectorAll('button')].flatMap(rects).concat(e.matches('button') ? rects(e) : [])).map((r) => ['launcher', r]),
          ...[...document.querySelectorAll('[data-jump-to-latest]')].flatMap(rects).map((r) => ['jumpToLatest', r]),
        ].filter(([, r]) => r.width > 0 && r.height > 0);
        const lines = [];
        for (const el of document.querySelectorAll('main p, main li')) {
          if (el.closest('form') || el.closest('[data-feedback-launcher]')) continue;
          const range = document.createRange();
          range.selectNodeContents(el);
          for (const r of range.getClientRects()) if (r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight) lines.push(r);
        }
        const hits = [];
        for (const [name, o] of overlays)
          for (const l of lines) {
            const ix = Math.min(o.right, l.right) - Math.max(o.left, l.left);
            const iy = Math.min(o.bottom, l.bottom) - Math.max(o.top, l.top);
            if (ix > 1 && iy > 1) hits.push(`${name}@[${Math.round(o.left)},${Math.round(o.top)}] x text[${Math.round(l.left)},${Math.round(l.top)},${Math.round(l.width)}]`);
          }
        return { launcherState: document.querySelector('[data-feedback-launcher]')?.getAttribute('data-feedback-launcher') ?? 'absent', overlays: overlays.map(([n, r]) => `${n}[${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)}]`), textLines: lines.length, hits: hits.slice(0, 6), hitCount: hits.length, dir: document.documentElement.dir };
      });
    const expandLauncher = async () => {
      const collapsed = p.locator('[data-feedback-launcher="collapsed"]');
      if ((await collapsed.count()) > 0) await collapsed.first().click().catch(() => null);
      await sleep(600);
    };
    const tImgC = tImg;
    const rows = [];
    for (const [w, h, locale] of [[360, 740, 'en'], [390, 844, 'en'], [390, 844, 'ar']]) {
      await p.setViewportSize({ width: w, height: h });
      if (locale === 'ar') {
        await openThread(p, tImgC);
        await p.locator('button[aria-label*="Select language"]').first().click();
        await p.locator('[role="menuitem"]').filter({ hasText: /^ar/i }).first().click();
        await p.waitForFunction(() => document.documentElement.dir === 'rtl', null, { timeout: 20000 }).catch(() => null);
      } else await openThread(p, tImgC);
      await expandLauncher();
      await sleep(1500);
      const atBottom = await overlap();
      const s1 = await shot(p, `C-overlap-${w}x${h}-${locale}-bottom`);
      // scroll the transcript up so Jump-to-latest appears
      await p.evaluate(() => {
        const sc = [...document.querySelectorAll('main *')].filter((e) => e.scrollHeight > e.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
        for (const e of sc) e.scrollTop = Math.max(0, e.scrollHeight / 3);
      });
      await sleep(1200);
      const scrolled = await overlap();
      const s2 = await shot(p, `C-overlap-${w}x${h}-${locale}-scrolled`);
      rows.push({ size: `${w}x${h}`, locale, atBottom, scrolled, screenshots: [s1, s2], pass: atBottom.hitCount === 0 && scrolled.hitCount === 0 && atBottom.launcherState === 'expanded' });
    }
    if (rows.some((r) => r.locale === 'ar')) await api('PATCH', '/users/me/preferences', paidTok, { languagePreference: 'EN' }).catch(() => null);
    // 740x360: the "−" collapse handle vs the thread side toolbar
    await p.setViewportSize({ width: 740, height: 360 });
    await openThread(p, tImgC);
    if ((await p.evaluate(() => document.documentElement.dir)) === 'rtl') {
      await p.setViewportSize({ width: 1440, height: 900 });
      await p.locator('button[aria-label*="Select language"], header button:has(svg.lucide-languages)').first().click().catch(() => null);
      await p.locator('[role="menuitem"]').filter({ hasText: /^en/i }).first().click().catch(() => null);
      await p.waitForFunction(() => document.documentElement.dir !== 'rtl', null, { timeout: 20000 }).catch(() => null);
      await p.setViewportSize({ width: 740, height: 360 });
      await openThread(p, tImgC);
    }
    await expandLauncher();
    const side = await p.evaluate(() => {
      const minus = document.querySelector('[data-feedback-launcher="expanded"] button');
      const tool = document.querySelector('button[aria-label="Compare Models"]')?.parentElement;
      const m = minus?.getBoundingClientRect();
      const t = tool?.getBoundingClientRect();
      if (!m || !t) return { found: false, minus: Boolean(m), toolbar: Boolean(t) };
      const ix = Math.min(m.right, t.right) - Math.max(m.left, t.left);
      const iy = Math.min(m.bottom, t.bottom) - Math.max(m.top, t.top);
      return { found: true, minus: [m.left, m.top, m.width, m.height].map(Math.round), toolbar: [t.left, t.top, t.width, t.height].map(Math.round), overlaps: ix > 1 && iy > 1 };
    });
    const s3 = await shot(p, 'C-740x360-minus-vs-toolbar');
    const sidePass = side.found ? !side.overlaps : null;
    result('C', rows.every((r) => r.pass) && sidePass !== false ? 'PASS' : 'FAIL', { rows, side740: { ...side, screenshot: s3 } });
  }

  await paid.ctx.close();

  // ── 7: free user ───────────────────────────────────────────────────────────
  if (want(7)) {
    const free = await uiLogin(browser, accounts.free, 'free');
    const f = free.page;
    const d = {};
    const tFreeImg = await thread(freeTok, { routingMode: 'AUTO' });
    await openThread(f, tFreeImg);
    await f.locator('textarea').first().fill('Generate an image of a lighthouse at dusk');
    await f.locator('button[aria-label="Send message"]').click();
    const notice = f.locator('[data-testid="plan-feature-notice"]').first();
    d.noticeVisible = await notice.waitFor({ state: 'visible', timeout: 180000 }).then(() => true).catch(() => false);
    if (d.noticeVisible) {
      d.noticeText = (await notice.innerText()).replace(/\s+/g, ' ');
      const link = notice.locator('a');
      d.linkVisible = await link.isVisible();
      d.linkHref = await link.getAttribute('href');
    }
    d.imageNoticeShot = await shot(f, '07-free-image-generation-plan-notice');
    const tFreeBlind = await thread(freeTok, { routingMode: 'MANUAL_MODEL', preferredProvider: BLIND.provider, preferredModel: BLIND.model });
    await openThread(f, tFreeBlind);
    await attach(f, PNG);
    d.replyRendered = await sendAndWait(f, 'What is in this image?');
    const chip = f.locator('[data-testid="attachment-delivery-chip"]').last();
    await chip.waitFor({ state: 'visible', timeout: 30000 }).catch(() => null);
    if ((await chip.count()) > 0) {
      d.chipTitle = await chip.getAttribute('title');
      d.badges = await chip.locator('[data-testid^="attachment-delivery-badge-"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid')}: ${e.textContent.trim()}`));
    }
    const act = speechActions(f).last();
    if ((await act.count()) > 0) {
      await sleep(3000);
      d.readAloudAriaDisabled = await act.getAttribute('aria-disabled');
      d.readAloudLabel = await act.getAttribute('aria-label');
      d.readAloudDimmed = ((await act.getAttribute('class')) ?? '').split(' ').includes('opacity-50');
      await act.click({ force: true });
      await sleep(1500);
      d.playerOpenedAfterClick = (await f.locator('[data-testid="message-speech-player"]').count()) > 0;
    }
    d.rawKeysOnPage = await checkNoRawKeys(f);
    d.backendFileDelivery = await lastAssistantDelivery(freeTok, tFreeBlind);
    d.readAloudAvailability = await api('GET', '/chat-messages/speech/availability', freeTok).then((r) => ({ http: r.status, body: r.text.slice(0, 200) }));
    d.blindShot = await shot(f, '07-free-no-vision-note-and-dimmed-read-aloud');
    const pass =
      d.noticeVisible && /Unlock/i.test(d.noticeText ?? '') && d.linkVisible && /plan/.test(d.linkHref ?? '') &&
      d.readAloudAriaDisabled === 'true' && d.readAloudDimmed && !d.playerOpenedAfterClick &&
      (d.badges ?? []).some((b) => /skipped|ocr|no vision/i.test(b)) && d.rawKeysOnPage.length === 0;
    result(7, pass ? 'PASS' : 'FAIL', d);
    await free.ctx.close();
  }
} catch (e) {
  report.fatal = String(e?.stack ?? e).slice(0, 800);
  console.log('FATAL', report.fatal);
} finally {
  await browser.close();
  // de-duplicate network rows for the report
  const seen = new Map();
  for (const n of report.network) {
    const k = `${n.who} ${n.method} ${n.url.replace(/[0-9a-z]{20,}/g, ':id')} ${n.status ?? n.error}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  report.networkSummary = [...seen.entries()].map(([k, c]) => `${k} x${c}`);
  const cseen = new Map();
  for (const c of report.console) {
    const k = `${c.who} ${c.text.slice(0, 160)}`;
    cseen.set(k, (cseen.get(k) ?? 0) + 1);
  }
  report.consoleSummary = [...cseen.entries()].map(([k, c]) => `${k} x${c}`);
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, process.env.QA_MMUI_REPORT ?? (ONLY.length ? `report-${ONLY.join('-')}.json` : 'report.json')), JSON.stringify(report, null, 2));
  console.log('SUMMARY', Object.entries(report.scenarios).map(([k, v]) => `${k}:${v.status}`).join(' '));
  console.log('NETWORK', report.networkSummary.join('\n'));
  console.log('CONSOLE', report.consoleSummary.join('\n'));
}
