#!/usr/bin/env node
// Task-specific context resolver. Deterministic lexical/structural retrieval —
// no external AI provider required. Produces a compact, linked context bundle
// so an agent reads ~6k tokens instead of the whole repo.
//
//   npm run knowledge:context -- --task="add refresh-token rotation"
//   npm run knowledge:context -- --task="fix chat streaming" --service=chat
//   npm run knowledge:context -- --task="change event schema" --event=message.created
//   npm run knowledge:context -- --task="update login" --route=/login --max-tokens=6000
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildManifests } from '../lib/manifests.mjs';
import { repoPath, listFiles, readText, isMain } from '../lib/repo.mjs';
import { stableStringify, cmp } from '../lib/fact.mjs';
import { classifyTask } from './classify-task.mjs';

function parseArgs(argv) {
  const args = { task: '', maxTokens: 6000 };
  for (const a of argv) {
    const m = /^--([a-zA-Z-]+)(?:=(.*))?$/.exec(a);
    if (!m) continue;
    const key = m[1];
    const val = m[2] ?? '';
    if (key === 'task') args.task = val;
    else if (key === 'service') args.service = val;
    else if (key === 'files') args.files = val.split(',').filter(Boolean);
    else if (key === 'event') args.event = val;
    else if (key === 'route') args.route = val;
    else if (key === 'symbols') args.symbols = val.split(',').filter(Boolean);
    else if (key === 'max-tokens') args.maxTokens = Number(val) || 6000;
  }
  return args;
}

function terms(task) {
  return [
    ...new Set(
      task
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2),
    ),
  ];
}

function scoreText(text, taskTerms) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const t of taskTerms) if (lower.includes(t)) score += 1;
  return score;
}

/** Rank governance docs (rules/ + skills/) by task-term overlap in their text. */
function rankGovernance(dir, taskTerms) {
  const out = [];
  for (const f of listFiles(repoPath(dir)).filter((x) => x.endsWith('.md'))) {
    const src = readText(repoPath(dir, f)) ?? '';
    const score = scoreText(src, taskTerms);
    if (score > 0) out.push({ file: `${dir}/${f}`, score });
  }
  return out.sort((a, b) => b.score - a.score || cmp(a.file, b.file)).slice(0, 8);
}

export function resolveContext(args) {
  const manifests = buildManifests();
  const taskTerms = terms(args.task);
  const classification = classifyTask(args.task, args);

  // Affected workspaces: explicit --service wins; else rank by term overlap.
  const services = manifests.services.services;
  let affectedWorkspaces;
  if (args.service) {
    affectedWorkspaces = services
      .filter((s) => s.name.includes(args.service))
      .map((s) => ({ name: s.name, reason: `explicit --service=${args.service}` }));
  } else if (classification.affectedServices !== undefined) {
    affectedWorkspaces = services
      .filter((s) => classification.affectedServices.includes(s.name))
      .map((s) => ({ name: s.name, reason: `curated ${classification.pack} task pack` }));
  } else {
    affectedWorkspaces = services
      .map((s) => ({
        name: s.name,
        score: scoreText(`${s.name} ${s.prismaModels.join(' ')}`, taskTerms),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || cmp(a.name, b.name))
      .slice(0, 4)
      .map((s) => ({ name: s.name, reason: `name/model term overlap (score ${s.score})` }));
  }

  const relatedEvents = manifests['rabbitmq-events'].events
    .filter((e) => (args.event ? e.pattern === args.event : scoreText(e.pattern, taskTerms) > 0))
    .slice(0, 8)
    .map((e) => e.pattern);

  const relatedPermissions = manifests.permissions.permissions
    .filter((p) => scoreText(p, taskTerms) > 0)
    .slice(0, 8);

  const relatedEnv = manifests['environment-variables'].variables
    .filter((v) => scoreText(v, taskTerms) > 0)
    .slice(0, 10);

  const relatedRoutes = manifests['frontend-routes'].routes
    .filter((r) => (args.route ? r.route.includes(args.route) : scoreText(r.route, taskTerms) > 0))
    .slice(0, 8)
    .map((r) => r.route);

  const rules = rankGovernance('rules', taskTerms);
  const skills = rankGovernance('skills', taskTerms);

  const missing = [];
  if (affectedWorkspaces.length === 0)
    missing.push('No workspace matched the task terms — pass --service to scope it.');
  if (taskTerms.length === 0)
    missing.push('Task description too short to rank — provide a fuller --task.');

  return {
    task: args.task,
    classification,
    affectedWorkspaces,
    governingRules: rules,
    matchingSkills: skills,
    recommendedReviewers: classification.reviewers,
    relatedEvents,
    relatedPermissions,
    relatedEnvVars: relatedEnv,
    relatedFrontendRoutes: relatedRoutes,
    filesToInspect: args.files ?? [],
    validationCommands: classification.validation,
    knownPitfalls: classification.pitfalls,
    missingInformation: missing,
    budget: { maxTokens: args.maxTokens },
  };
}

function toMarkdown(ctx) {
  const list = (arr) =>
    arr.length > 0
      ? arr.map((x) => `- ${typeof x === 'string' ? x : (x.file ?? x.name)}`).join('\n')
      : '- (none matched)';
  const wsList = ctx.affectedWorkspaces.length
    ? ctx.affectedWorkspaces.map((w) => `- **${w.name}** — ${w.reason}`).join('\n')
    : '- (none matched — scope with --service)';
  return `<!-- GENERATED (local) by tools/knowledge/context.mjs — not committed. -->
# Task context: ${ctx.task || '(unspecified)'}

**Classification:** ${ctx.classification.pack} — ${ctx.classification.summary}

## Affected workspaces
${wsList}

## Governing rules (read these)
${list(ctx.governingRules)}

## Matching skills
${list(ctx.matchingSkills)}

## Recommended reviewers
${list(ctx.recommendedReviewers)}

## Related events
${list(ctx.relatedEvents)}

## Related permissions
${list(ctx.relatedPermissions)}

## Related env vars
${list(ctx.relatedEnvVars)}

## Related frontend routes
${list(ctx.relatedFrontendRoutes)}

## Files to inspect
${list(ctx.filesToInspect)}

## Validation
${ctx.validationCommands.map((c) => `\`${c}\``).join('  \n')}

## Known pitfalls
${list(ctx.knownPitfalls)}

## Missing / ambiguous
${list(ctx.missingInformation)}

_Budget: ${ctx.budget.maxTokens} tokens. Link, don't inline — open the files above as needed._
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const ctx = resolveContext(args);
  mkdirSync(repoPath('.ai/local'), { recursive: true });
  writeFileSync(repoPath('.ai/local/current-context.json'), stableStringify(ctx));
  writeFileSync(repoPath('.ai/local/current-context.md'), toMarkdown(ctx));
  console.log(`Resolved context for: "${args.task}"`);
  console.log(
    `  pack=${ctx.classification.pack} · workspaces=${ctx.affectedWorkspaces.length} · rules=${ctx.governingRules.length} · skills=${ctx.matchingSkills.length}`,
  );
  console.log('  → .ai/local/current-context.md');
}

if (isMain(import.meta.url)) main();
