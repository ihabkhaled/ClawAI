#!/usr/bin/env node
// Live Intelligence: real YouTube news channels through the resolver (ADR-221).
// Channel-id links play via YouTube's live_stream embed; @handle links are refused
// with LIVE_YOUTUBE_HANDLE_UNSUPPORTED; analysis comes only from the viewer's tab audio.
//   NODE_EXTRA_CA_CERTS=certs/rootCA.pem node --env-file=.env scripts/qa/live-youtube-matrix.mjs
const BASE = process.env.LIVE_QA_BASE ?? 'https://claw.local/api/v1';
const CHANNELS = {
  'Al Jazeera English': ['UCNye-wNBqNL5ZzHSJj3l8Bg', '@aljazeeraenglish'],
  'BBC News': ['UC16niRr50-MSBwiO3YDb3RA', '@BBCNews'],
  'Sky News': ['UCoMdktPbSTixAyNGwb-UYkQ', '@SkyNews'],
  'DW News': ['UCknLrEdhRCp1aegoMqRaCZg', '@dwnews'],
  'France 24 English': ['UCQfwfsi5VrQ8yKZ-UWmAEFg', '@France24_en'],
  NASA: ['UCLA_DiR1FfKNvjuUpBHmylQ', '@NASA'],
  euronews: ['UCSrZ3UV4jOidv8ppoVuvW9Q', '@euronews'],
  'ABC News': ['UCBi2mrWuNuyYy4gbM6fW3_A', '@ABCNews'],
  CNA: ['UC83jt4dlz1Gjl58fzQrrKZg', '@CNA'],
  'Al Arabiya': ['UCahpxixMCwoANAftn6IxkTg', '@AlArabiya'],
};
let failed = 0;
const login = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
});
const token = (await login.json()).tokens.accessToken;
const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(async (res) => ({ status: res.status, data: await res.json().catch(() => null) }));
for (const [name, [channelId, handle]] of Object.entries(CHANNELS)) {
  const channel = await post('/live/sources/resolve', {
    url: `https://www.youtube.com/channel/${channelId}/live`,
  });
  const okChannel =
    channel.status < 300 &&
    channel.data.capability === 'BROWSER_CAPTURE' &&
    channel.data.embedUrl?.includes(`live_stream?channel=${channelId}`);
  const byHandle = await post('/live/sources/resolve', {
    url: `https://www.youtube.com/${handle}/live`,
  });
  const okHandle =
    byHandle.status === 422 &&
    JSON.stringify(byHandle.data).includes('LIVE_YOUTUBE_HANDLE_UNSUPPORTED');
  const session = await post('/live/sessions', {
    url: `https://www.youtube.com/channel/${channelId}/live`,
    language: 'en',
    mode: 'AUDIO',
  });
  const okSession =
    session.status < 300 && session.data.state === 'UNSUPPORTED' && session.data.runId === null;
  if (okSession) {
    await fetch(`${BASE}/live/sessions/${session.data.sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  const ok = okChannel && okHandle && okSession;
  if (!ok) failed += 1;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${name}: channel=${channel.status} handle=${byHandle.status} session=${session.status}/${session.data?.state} run=${session.data?.runId ?? 'none'}`,
  );
}
console.log(`\n${10 - failed}/10 passed`);
process.exit(failed === 0 ? 0 : 1);
