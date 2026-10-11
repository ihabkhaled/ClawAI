// Usage: node summarize.cjs <results.json> [more.json ...]  -- prints failing route x viewport cells grouped by route.
const fs = require('node:fs');
const rows = process.argv.slice(2).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const by = new Map();
for (const r of rows) {
  if (!r.fail) continue;
  const k = `${r.locale} ${r.route}`;
  if (!by.has(k)) by.set(k, []);
  by.get(k).push(
    `${r.vp}[${[...new Set(r.issues.filter((i) => i.kind !== 'small-tap-target').map((i) => i.kind))].join('+')}]`,
  );
}
for (const [k, v] of by) console.log(k, '=>', v.join(' '));
console.log(`cells ${rows.length}, failing ${rows.filter((r) => r.fail).length}`);
