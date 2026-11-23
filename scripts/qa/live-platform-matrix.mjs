#!/usr/bin/env node
// Live Intelligence platform resolver matrix (ADR-221, batch 2): one real-shaped link
// per platform through POST /live/sources/resolve. Parsing only, except the Twitch
// server-pull probe (ADR-221 batch 3).
//   NODE_EXTRA_CA_CERTS=certs/rootCA.pem node --env-file=.env scripts/qa/live-platform-matrix.mjs
const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const CASES = [
  [
    'YouTube video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'YOUTUBE',
    'BROWSER_CAPTURE',
    true,
  ],
  [
    'YouTube channel',
    'https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg/live',
    'YOUTUBE',
    'BROWSER_CAPTURE',
    false,
  ],
  // Any platform but Discord is SERVER_PULL while live (ADR-221 batch 4); the column is the fallback.
  ['Twitch (Kai Cenat)', 'https://www.twitch.tv/kaicenat', 'TWITCH', 'BROWSER_CAPTURE', true],
  ['Twitch (xQc)', 'https://twitch.tv/xqc', 'TWITCH', 'BROWSER_CAPTURE', true],
  ['Kick (Adin Ross)', 'https://kick.com/adinross', 'KICK', 'BROWSER_CAPTURE', true],
  [
    'Facebook Live',
    'https://www.facebook.com/watch/live/?v=123456789012345',
    'FACEBOOK',
    'BROWSER_CAPTURE',
    false,
  ],
  ['TikTok LIVE', 'https://www.tiktok.com/@khaby.lame/live', 'TIKTOK', 'LINK_ONLY', false],
  ['Instagram Live', 'https://www.instagram.com/natgeo/live', 'INSTAGRAM', 'LINK_ONLY', false],
  ['Rumble', 'https://rumble.com/v4abcd-live-show.html', 'RUMBLE', 'LINK_ONLY', false],
  ['BIGO LIVE', 'https://www.bigo.tv/123456789', 'BIGO', 'LINK_ONLY', false],
  [
    'LinkedIn Live',
    'https://www.linkedin.com/events/7250000000000000000/',
    'LINKEDIN',
    'LINK_ONLY',
    false,
  ],
  ['Telegram Live', 'https://t.me/durov?livestream', 'TELEGRAM', 'LINK_ONLY', false],
  ['Bilibili Live', 'https://live.bilibili.com/21452505', 'BILIBILI', 'LINK_ONLY', false],
  [
    'CHZZK',
    'https://chzzk.naver.com/live/0123456789abcdef0123456789abcdef',
    'CHZZK',
    'LINK_ONLY',
    false,
  ],
  ['SOOP Korea', 'https://play.sooplive.co.kr/someid', 'SOOP', 'LINK_ONLY', false],
  ['Nimo TV', 'https://www.nimo.tv/someuser', 'NIMO', 'LINK_ONLY', false],
];
const login = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
});
const headers = {
  Authorization: `Bearer ${(await login.json()).tokens.accessToken}`,
  'Content-Type': 'application/json',
};
const resolve = (url) =>
  fetch(`${BASE}/live/sources/resolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
  }).then(async (res) => ({ status: res.status, data: await res.json().catch(() => null) }));
let failed = 0;
for (const [name, url, platform, capability, hasChat] of CASES) {
  const r = await resolve(url);
  const ok =
    r.status === 200 &&
    r.data.platform === platform &&
    [capability, 'SERVER_PULL'].includes(r.data.capability) &&
    Boolean(r.data.chatEmbedUrl) === hasChat &&
    typeof r.data.watchUrl === 'string' &&
    r.data.watchUrl.startsWith('https://');
  if (!ok) failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${name}: ${r.status} ${r.data?.platform}/${r.data?.capability} embed=${r.data?.embedUrl ? 'yes' : 'no'} chat=${r.data?.chatEmbedUrl ? 'yes' : 'no'}`,
  );
}
const discord = await resolve('https://discord.gg/abcdef');
const discordOk =
  discord.status === 422 && JSON.stringify(discord.data).includes('LIVE_DISCORD_PRIVATE');
if (!discordOk) failed += 1;
console.log(`${discordOk ? 'PASS' : 'FAIL'}  Discord Go Live refused: ${discord.status}`);
console.log(`\n${CASES.length + 1 - failed}/${CASES.length + 1} passed`);
process.exit(failed ? 1 : 0);
