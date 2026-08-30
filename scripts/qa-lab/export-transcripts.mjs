// Captures the real transcripts of the paraphrase experiment's threads so the
// composer can be replayed against them offline, without another live run.
import { login, listAllMessages, writeJson } from './client.mjs';
import fs from 'node:fs';
import glob from 'node:fs';

await login();
const dirs = fs.readdirSync('./results').filter((d) => d.startsWith('PARAPHRASE-'));
const rows = [];
for (const d of dirs) {
  const f = `./results/${d}/paraphrase.jsonl`;
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').trim().split('\n')) rows.push(JSON.parse(line));
}
console.log(`${rows.length} threads to capture`);
const out = [];
for (const row of rows) {
  const messages = await listAllMessages(row.threadId);
  out.push({
    threadId: row.threadId,
    model: row.model,
    phrasing: row.phrasing,
    recalledLive: row.recalled,
    messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
  });
  console.log(`  ${row.model} ${row.phrasing}: ${messages.length} messages`);
}
writeJson('./fixtures/paraphrase-transcripts.json', out);
console.log(`\nwrote ./fixtures/paraphrase-transcripts.json (${out.length} threads)`);
