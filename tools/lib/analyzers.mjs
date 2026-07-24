// Cross-source analyzers. These compute disagreements, stale claims, and
// duplication FROM the extracted facts — so the audit narrative cites real,
// reproducible findings ("source A says X, source B says Y") rather than prose
// guesses. Every finding names the evidence.
import { repoPath, readText, fileSize } from './repo.mjs';
import { cmp } from './fact.mjs';

/**
 * Contradictions: same fact asserted differently across canonical sources.
 * Currently checks ports (shared-constants vs nginx vs .env.example) and
 * service-count claims embedded in the big doc files.
 */
export function findContradictions(inv) {
  const findings = [];

  // Port agreement: shared-constants is the declared owner; nginx routes must agree.
  const portByService = {};
  for (const [key, fact] of Object.entries(inv.ports)) {
    // AUTH_SERVICE_PORT -> auth-service
    const svc = `${key.replace(/_SERVICE_PORT$/, '').toLowerCase().replace(/_/g, '-')}-service`;
    portByService[svc] = fact.value;
  }
  for (const r of inv.nginxRoutes) {
    const declared = portByService[r.service];
    if (declared !== undefined && declared !== r.port) {
      findings.push({
        kind: 'port-mismatch',
        severity: 'high',
        message: `nginx routes ${r.location} to ${r.service}:${r.port} but shared-constants declares ${r.service} on port ${declared}`,
        evidence: ['packages/shared-constants/src/index.ts', 'infra/nginx/nginx.conf'],
      });
    }
  }

  // Docker services that look like app services but are absent from the workspace catalog.
  const wsServiceNames = new Set(
    inv.workspaces.filter((w) => w.type === 'nestjs-service').map((w) => w.name.replace(/^claw-/, '')),
  );
  for (const d of inv.dockerServices) {
    const normalized = d.name.replace(/-service$/, '');
    const looksLikeAppService = d.name.endsWith('-service');
    if (looksLikeAppService && !wsServiceNames.has(`${normalized}-service`) && !wsServiceNames.has(normalized)) {
      findings.push({
        kind: 'docker-service-without-workspace',
        severity: 'medium',
        message: `docker compose defines service "${d.name}" (${d.files.join(', ')}) with no matching workspace in apps/`,
        evidence: d.files,
      });
    }
  }

  // Numeric "N services" claims in the large docs vs the derived count.
  const actualServices = inv.workspaces.filter((w) => w.type === 'nestjs-service').length;
  for (const doc of ['CLAUDE.md', 'README.md', 'CODEX.md']) {
    const src = readText(repoPath(doc));
    if (!src) continue;
    for (const m of src.matchAll(/(\d+)\s+NestJS microservices/g)) {
      const claimed = Number(m[1]);
      if (claimed !== actualServices) {
        findings.push({
          kind: 'stale-service-count',
          severity: 'medium',
          message: `${doc} claims "${claimed} NestJS microservices" but the workspace catalog derives ${actualServices}`,
          evidence: [doc, 'packages (derived)'],
        });
      }
    }
  }

  return findings.sort((a, b) => cmp(a.kind, b.kind) || cmp(a.message, b.message));
}

/**
 * Port coverage: every NestJS service should have a declared *_SERVICE_PORT in
 * shared-constants. Services missing one are relying on undocumented env-only
 * ports — a discoverability gap for humans and agents alike.
 */
export function findPortCoverageGaps(inv) {
  const declared = new Set(
    Object.keys(inv.ports).map((k) => k.replace(/_SERVICE_PORT$/, '').toLowerCase().replace(/_/g, '-')),
  );
  const findings = [];
  for (const ws of inv.workspaces) {
    if (ws.type !== 'nestjs-service') continue;
    const short = ws.name.replace(/^claw-/, '').replace(/-service$/, '');
    if (!declared.has(short)) {
      findings.push({
        kind: 'service-without-port-constant',
        severity: 'medium',
        message: `service ${ws.name} has no *_SERVICE_PORT constant in shared-constants (port is env-only, not in the canonical catalog)`,
        evidence: [`${ws.dir}`, 'packages/shared-constants/src/index.ts'],
      });
    }
  }
  return findings.sort((a, b) => cmp(a.message, b.message));
}

/** Staleness: locale-count and other embedded numeric claims vs derived facts. */
export function findStaleClaims(inv) {
  const findings = [];
  const localeCount = inv.i18n.localeCount;
  for (const doc of ['CLAUDE.md', 'README.md', 'CODEX.md']) {
    const src = readText(repoPath(doc));
    if (!src) continue;
    for (const m of src.matchAll(/(\d+)\s+(?:languages|locales)\b/gi)) {
      if (Number(m[1]) !== localeCount) {
        findings.push({
          kind: 'stale-locale-count',
          severity: 'low',
          message: `${doc} claims ${m[1]} locales but ${localeCount} locale files exist`,
          evidence: [doc, 'apps/claw-frontend/src/lib/i18n/locales'],
        });
      }
    }
  }
  return findings.sort((a, b) => cmp(a.message, b.message));
}

/**
 * Duplication: the giant mirrored AI instruction files. Reports their sizes and
 * a crude shared-heading overlap so the narrative can quantify the redundancy
 * the initiative is meant to remove.
 */
export function findDuplication() {
  const files = ['CLAUDE.md', 'CODEX.md', 'cursor.md'].filter((f) => fileSize(repoPath(f)) > 0);
  const headings = {};
  for (const f of files) {
    const src = readText(repoPath(f)) ?? '';
    headings[f] = new Set((src.match(/^#{1,3}\s+.+$/gm) ?? []).map((h) => h.replace(/^#+\s+/, '').trim()));
  }
  const findings = [];
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const a = headings[files[i]];
      const b = headings[files[j]];
      const shared = [...a].filter((h) => b.has(h));
      if (shared.length > 0) {
        findings.push({
          kind: 'mirrored-instruction-overlap',
          severity: 'medium',
          message: `${files[i]} and ${files[j]} share ${shared.length} identical headings (${fileSize(repoPath(files[i]))} vs ${fileSize(repoPath(files[j]))} bytes) — candidates for compact routing`,
          evidence: [files[i], files[j]],
        });
      }
    }
  }
  return findings;
}

/**
 * Governance-bypass scan: any policy/rule/doc/AI file that recommends bypassing
 * git hooks. This is the machine check behind the "no --no-verify" rule.
 */
export function findBypassRecommendations() {
  const roots = ['CLAUDE.md', 'CODEX.md', 'cursor.md', 'README.md', 'AGENTS.md'];
  const findings = [];
  for (const f of roots) {
    const src = readText(repoPath(f));
    if (!src) continue;
    let count = 0;
    const examples = [];
    for (const line of src.split(/\r?\n/)) {
      const idx = line.indexOf('--no-verify');
      if (idx < 0) continue;
      // A line is a RECOMMENDATION unless it is negated (a prohibition like
      // "NEVER use --no-verify" is good policy and must be allowed to stay).
      const before = line.slice(0, idx).toLowerCase();
      const negated = /\b(never|not|don't|dont|do not|avoid|without|no need)\b/.test(before);
      if (!negated) {
        count += 1;
        if (examples.length < 2) examples.push(line.trim().slice(0, 80));
      }
    }
    if (count > 0) {
      findings.push({
        kind: 'hook-bypass-recommendation',
        severity: 'high',
        message: `${f} affirmatively recommends "--no-verify" ${count} time(s) — canonical policy must not recommend bypassing hooks (e.g. "${examples[0]}")`,
        evidence: [f],
      });
    }
  }
  return findings;
}
