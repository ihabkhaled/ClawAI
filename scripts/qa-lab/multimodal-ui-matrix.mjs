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
const SHOTS = path.join(OUT, 'screenshots');
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
  return `screenshots/${file}`;
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
  fs.writeFileSync(path.join(OUT, ONLY.length ? `report-${ONLY.join('-')}.json` : 'report.json'), JSON.stringify(report, null, 2));
  console.log('SUMMARY', Object.entries(report.scenarios).map(([k, v]) => `${k}:${v.status}`).join(' '));
  console.log('NETWORK', report.networkSummary.join('\n'));
  console.log('CONSOLE', report.consoleSummary.join('\n'));
}
