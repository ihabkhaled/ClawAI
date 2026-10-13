#!/usr/bin/env node
// Builds the GitHub wiki at publish time (publish-wiki.yml). The repository
// keeps only the hand-written wiki pages; everything that only restates a
// repository file or a manifest is rendered here from its single source, so it
// can never drift and is never a second copy to maintain (ADR-168, rules/63).
//
//   - mirror pages: wiki/mirrors.json maps a page name to the repository file
//     it mirrors; the page is that file with relative links made absolute.
//   - service pages (Service-claw-<name>.md), Frontend-Routes, Prisma-Models
//     and RabbitMQ-Events: rendered from the generated .ai/manifests.
//
//   node tools/knowledge/render-wiki.mjs --out <dir>
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';

import { buildManifests } from '../lib/manifests.mjs';
import { isMain, readJson, repoPath } from '../lib/repo.mjs';

export const REPO_BLOB = 'https://github.com/ihabkhaled/ClawAI/blob/main/';
const MIRRORS_REL = 'wiki/mirrors.json';

export function readMirrors() {
  return readJson(repoPath(MIRRORS_REL))?.mirrors ?? {};
}

/** Relative markdown links in `text` (a file at `sourceRel`) made absolute repo links. */
export function absolutiseLinks(text, sourceRel) {
  return text.replace(/(\]\()(?!https?:|mailto:|#)([^)\s]+)(\))/gu, (match, open, target, close) => {
    const [path, anchor] = target.split('#');
    const rel = path.startsWith('/') ? path.slice(1) : posix.normalize(posix.join(posix.dirname(sourceRel), path));
    if (rel.startsWith('../')) return match;
    return `${open}${REPO_BLOB}${rel}${anchor === undefined ? '' : `#${anchor}`}${close}`;
  });
}

export function renderMirror(page, sourceRel) {
  const source = readFileSync(repoPath(sourceRel), 'utf8').replace(/\r\n/gu, '\n');
  return [
    `> **Canonical source:** [\`${sourceRel}\`](${REPO_BLOB}${sourceRel}) — this page is rendered from it on every publish; edit the source.`,
    '',
    absolutiseLinks(source, sourceRel).trimEnd(),
    '',
  ].join('\n');
}

function link(rel, label = rel) {
  return `[${label}](${REPO_BLOB}${rel})`;
}

function servicePage(service, manifests) {
  const endpoints = manifests['api-endpoints'].byService[service.name] ?? [];
  const events = manifests['event-graph'].events;
  const produces = events.filter((e) => e.producers.includes(service.name)).map((e) => e.pattern);
  const consumes = events.filter((e) => e.consumers.includes(service.name)).map((e) => e.pattern);
  const guide = `docs/04-backend/service-guide-${service.name.replace(/^claw-/u, '').replace(/-service$/u, '')}.md`;
  const lines = [
    `# ${service.name}`,
    '',
    `Rendered from \`.ai/manifests/\` on every publish. Rules for this service: ${link(`${service.dir}/CLAUDE.md`, 'CLAUDE.md')} · guide: ${link(guide, 'service guide')}.`,
    '',
    '| Property | Value |',
    '| --- | --- |',
    `| Directory | ${link(service.dir)} |`,
    `| Port | ${service.port ?? 'env only'} |`,
    `| Database | ${service.database} |`,
    `| Test files | ${service.testFiles} (${service.testRunner}) |`,
    `| Internal packages | ${service.internalDeps.join(', ') || 'none'} |`,
    '',
    '## Persistence models',
    '',
    ...(service.prismaModels.length + service.mongooseModels.length === 0
      ? ['None.']
      : [...service.prismaModels, ...service.mongooseModels].map((model) => `- \`${model}\``)),
    '',
    `## HTTP API (${endpoints.length})`,
    '',
    '| Method | Route | Source |',
    '| --- | --- | --- |',
    ...endpoints.map((e) => `| ${e.method} | \`${e.route}\` | ${link(e.source, e.source.split('/').pop())} |`),
    '',
    '## Events (inferred from source; verify before a critical change)',
    '',
    `- Publishes: ${produces.map((p) => `\`${p}\``).join(', ') || 'none found'}`,
    `- Consumes: ${consumes.map((p) => `\`${p}\``).join(', ') || 'none found'}`,
    '',
  ];
  return lines.join('\n');
}

/** Pages rendered from the manifests. */
export function renderManifestPages(manifests = buildManifests()) {
  const pages = {};
  for (const service of manifests.services.services) {
    pages[`Service-${service.name}.md`] = servicePage(service, manifests);
  }
  pages['Frontend-Routes.md'] = [
    '# Frontend routes',
    '',
    'Rendered from `.ai/manifests/frontend-routes.json` on every publish.',
    '',
    '| Route | File |',
    '| --- | --- |',
    ...manifests['frontend-routes'].routes.map((r) => `| \`${r.route}\` | ${link(r.file, r.file.replace('apps/claw-frontend/src/app/', ''))} |`),
    '',
  ].join('\n');
  pages['Prisma-Models.md'] = [
    '# Prisma models',
    '',
    'Rendered from `.ai/manifests/prisma-models.json` on every publish. Each service owns its database.',
    '',
    ...Object.entries(manifests['prisma-models'].byService).flatMap(([service, models]) => [
      `## ${service}`,
      '',
      ...models.map((model) => `- \`${model}\``),
      '',
    ]),
  ].join('\n');
  pages['RabbitMQ-Events.md'] = [
    '# RabbitMQ events',
    '',
    `Exchange \`${manifests['rabbitmq-events'].exchange}\`. Rendered from \`.ai/manifests/event-graph.json\` on every publish; producers and consumers are inferred from source.`,
    '',
    '| Pattern | Producers | Consumers |',
    '| --- | --- | --- |',
    ...manifests['event-graph'].events.map((e) => `| \`${e.pattern}\` | ${e.producers.join(', ') || '—'} | ${e.consumers.join(', ') || '—'} |`),
    '',
  ].join('\n');
  return pages;
}

/** Names of every page that exists only at publish time. */
export function renderedPageNames(manifests = buildManifests()) {
  return [...Object.keys(readMirrors()), ...Object.keys(renderManifestPages(manifests))];
}

function main() {
  const outArg = process.argv.find((a) => a.startsWith('--out='));
  const outIndex = process.argv.indexOf('--out');
  const out = outArg ? outArg.slice(6) : process.argv[outIndex + 1];
  if (!out) {
    console.error('usage: render-wiki.mjs --out <dir>');
    process.exit(2);
  }
  mkdirSync(out, { recursive: true });
  let count = 0;
  for (const file of readdirSync(repoPath('wiki')).filter((f) => f.endsWith('.md'))) {
    writeFileSync(join(out, file), readFileSync(repoPath('wiki', file)));
    count += 1;
  }
  for (const [page, source] of Object.entries(readMirrors())) {
    writeFileSync(join(out, page), renderMirror(page, source));
    count += 1;
  }
  for (const [page, content] of Object.entries(renderManifestPages())) {
    writeFileSync(join(out, page), content);
    count += 1;
  }
  console.log(`wiki rendered: ${count} pages in ${out}`);
}

if (isMain(import.meta.url)) main();
