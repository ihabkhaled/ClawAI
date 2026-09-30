// Live: kill file-service mid video job, prove the boot sweep re-queues it. Small Gemini spend (a 12 s clip).
import fs from 'node:fs';
import { execSync } from 'node:child_process';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { ensureAccounts, apiLogin, api } = await import('./multimodal-ui-accounts.mjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (c) => execSync(c, { encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
const { paid } = await ensureAccounts();
const token = await apiLogin(paid.email, paid.password);
sh('docker exec claw-file-service ffmpeg -y -f lavfi -i testsrc=size=320x240:rate=10 -f lavfi -i sine=frequency=440 -t 12 -c:v libx264 -pix_fmt yuv420p -c:a aac /tmp/r.mp4');
sh('docker cp claw-file-service:/tmp/r.mp4 ./.restart-clip.mp4');
const b64 = fs.readFileSync('./.restart-clip.mp4').toString('base64');
fs.unlinkSync('./.restart-clip.mp4');
const since = new Date().toISOString();
const up = await api('POST', '/files/upload', token, { filename: 'restart.mp4', mimeType: 'video/mp4', sizeBytes: Buffer.from(b64, 'base64').length, content: b64 });
const id = up.json.id;
console.log('uploaded', id);
let started = false;
for (let i = 0; i < 60 && !started; i++) {
  await sleep(500);
  started = /video/i.test(sh(`docker logs claw-file-service --since ${since} 2>&1 | grep ${id} || true`));
}
console.log('job seen in logs before restart:', started);
sh('docker restart claw-file-service');
console.log('restarted');
let file;
for (let i = 0; i < 90; i++) {
  await sleep(4000);
  try { file = (await api('GET', `/files/${id}`, token)).json; } catch { continue; }
  if (!file) continue;
  const t = file.extractedText ?? '';
  if (t && !t.startsWith('[Video file: ') || file.extractionError) break;
}
console.log('final extractedText:', String(file?.extractedText ?? '').slice(0, 160), '| error:', file?.extractionError ?? '');
console.log(sh(`docker logs claw-file-service --since ${since} 2>&1 | grep -iE "stale|requeue|re-queue|video" | grep ${id} | tail -8 || true`));
