#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';

import { cmp, stableStringify } from '../lib/fact.mjs';
import { buildManifests } from '../lib/manifests.mjs';
import { isMain, listFiles, readJson, readText, repoPath } from '../lib/repo.mjs';
import { classifyTask } from './classify-task.mjs';
import { contextCacheKey, readContextCache, writeContextCache } from './context-cache.mjs';
import { compileSourceNeighborhood } from './source-neighborhood.mjs';

const MANIFEST_NAMES = [
  'services',
  'rabbitmq-events',
  'permissions',
  'environment-variables',
  'frontend-routes',
  'workspace-dependency-graph',
];

function parseArgs(argv) {
  const args = { task: '', maxTokens: 6000 };
  for (const argument of argv) {
    const match = /^--([a-zA-Z-]+)(?:=(.*))?$/u.exec(argument);
    if (!match) continue;
    const key = match[1];
    const value = match[2] ?? '';
    if (key === 'task') args.task = value;
    else if (key === 'service') args.service = value;
    else if (key === 'files') args.files = value.split(',').filter(Boolean);
    else if (key === 'event') args.event = value;
    else if (key === 'route') args.route = value;
    else if (key === 'symbols') args.symbols = value.split(',').filter(Boolean);
    else if (key === 'max-tokens') args.maxTokens = Number(value) || 6000;
    else if (key === 'mode') args.mode = value.toUpperCase();
    else if (key === 'no-cache') args.noCache = true;
    else if (key === 'refresh-cache') args.refreshCache = true;
  }
  return args;
}

function terms(task) {
  return [
    ...new Set(
      task
        .toLowerCase()
        .split(/[^a-z0-9]+/u)
        .filter((term) => term.length > 2),
    ),
  ];
}

function scoreText(text, taskTerms) {
  const lower = text.toLowerCase();
  return taskTerms.reduce((score, term) => score + (lower.includes(term) ? 1 : 0), 0);
}

function rankGovernance(directory, taskTerms) {
  return listFiles(repoPath(directory))
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({
      file: `${directory}/${file}`,
      score: scoreText(readText(repoPath(directory, file)) ?? '', taskTerms),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || cmp(left.file, right.file))
    .slice(0, 8);
}

function loadManifests() {
  const loaded = Object.fromEntries(
    MANIFEST_NAMES.map((name) => [name, readJson(repoPath('.ai/manifests', `${name}.json`))]),
  );
  return MANIFEST_NAMES.every((name) => loaded[name] !== null) ? loaded : buildManifests();
}

function selectMode(args, classification) {
  if (['FAST', 'NORMAL', 'DEEP', 'AUDIT'].includes(args.mode)) return args.mode;
  if (/\b(?:audit|release|cross[- ]workspace)\b/iu.test(args.task)) return 'AUDIT';
  if (
    ['authentication-security', 'billing-payments', 'database-migration'].includes(
      classification.pack,
    )
  )
    return 'DEEP';
  if (/\b(?:typo|readme|rename|copy)\b/iu.test(args.task)) return 'FAST';
  return 'NORMAL';
}

function riskFor(classification, mode) {
  if (
    mode === 'AUDIT' ||
    ['authentication-security', 'billing-payments', 'database-migration'].includes(
      classification.pack,
    )
  )
    return 'HIGH';
  return classification.pack === 'documentation' ? 'LOW' : 'MEDIUM';
}

function resolveUncached(args) {
  const manifests = loadManifests();
  const taskTerms = terms(args.task);
  const classification = classifyTask(args.task, args);
  const mode = selectMode(args, classification);
  const risk = riskFor(classification, mode);
  const services = manifests.services.services;
  let affectedWorkspaces;
  if (args.service) {
    affectedWorkspaces = services
      .filter((service) => service.name.includes(args.service))
      .map((service) => ({ name: service.name, reason: `explicit --service=${args.service}` }));
  } else if (classification.affectedServices !== undefined) {
    affectedWorkspaces = services
      .filter((service) => classification.affectedServices.includes(service.name))
      .map((service) => ({
        name: service.name,
        reason: `curated ${classification.pack} task pack`,
      }));
  } else {
    affectedWorkspaces = services
      .map((service) => ({
        name: service.name,
        score: scoreText(`${service.name} ${service.prismaModels.join(' ')}`, taskTerms),
      }))
      .filter((service) => service.score > 0)
      .sort((left, right) => right.score - left.score || cmp(left.name, right.name))
      .slice(0, 4)
      .map((service) => ({
        name: service.name,
        reason: `name/model term overlap (score ${service.score})`,
      }));
  }
  const relatedEvents = manifests['rabbitmq-events'].events
    .filter((event) =>
      args.event ? event.pattern === args.event : scoreText(event.pattern, taskTerms) > 0,
    )
    .slice(0, 8)
    .map((event) => event.pattern);
  const relatedPermissions = manifests.permissions.permissions
    .filter((permission) => scoreText(permission, taskTerms) > 0)
    .slice(0, 8);
  const relatedEnvVars = manifests['environment-variables'].variables
    .filter((variable) => scoreText(variable, taskTerms) > 0)
    .slice(0, 10);
  const relatedFrontendRoutes = manifests['frontend-routes'].routes
    .filter((route) =>
      args.route ? route.route.includes(args.route) : scoreText(route.route, taskTerms) > 0,
    )
    .slice(0, 8)
    .map((route) => route.route);
  const governingRules = rankGovernance('rules', taskTerms);
  const matchingSkills = rankGovernance('skills', taskTerms);
  const missingInformation = [];
  if (affectedWorkspaces.length === 0)
    missingInformation.push('No workspace matched the task terms — pass --service to scope it.');
  if (taskTerms.length === 0)
    missingInformation.push('Task description too short to rank — provide a fuller --task.');
  const neighborhood = compileSourceNeighborhood(args.task, { mode });
  const names = new Set(affectedWorkspaces.map((workspace) => workspace.name));
  const dependencies = manifests['workspace-dependency-graph'].edges
    .filter((edge) => names.has(edge.from) || names.has(edge.to))
    .slice(0, 12);
  const compiledConstraints = [
    ...classification.pitfalls.map((text) => ({
      kind: 'MANDATORY',
      text,
      source: `pack:${classification.pack}`,
    })),
    ...governingRules
      .slice(0, mode === 'FAST' ? 3 : 6)
      .map((rule) => ({ kind: 'SOURCE', text: rule.file, source: rule.file })),
  ];
  const context = {
    task: args.task,
    mode,
    risk,
    classification,
    affectedWorkspaces,
    governingRules,
    matchingSkills,
    recommendedReviewers: classification.reviewers,
    relatedEvents,
    relatedPermissions,
    relatedEnvVars,
    relatedFrontendRoutes,
    filesToInspect: args.files ?? [],
    validationCommands: classification.validation,
    knownPitfalls: classification.pitfalls,
    missingInformation,
    budget: { maxTokens: args.maxTokens },
    compiledConstraints,
    likelySourceFiles: neighborhood.files,
    likelyTests: neighborhood.tests,
    dependencies,
    sourceScope: {
      strategy: 'git ls-files ranked neighborhood',
      trackedFiles: neighborhood.trackedFileCount,
    },
  };
  const outputCharacters = stableStringify(context).length;
  return {
    ...context,
    outputCharacters,
    efficiency: {
      estimatedTokens: Math.ceil(outputCharacters / 4),
      baseline: 'not measured',
      rulesLoaded: governingRules.length,
      skillsLoaded: matchingSkills.length,
      initialCodeFiles: neighborhood.files.length,
      initialTestFiles: neighborhood.tests.length,
    },
  };
}

export function resolveContext(args) {
  const normalized = { ...args, task: args.task ?? '', maxTokens: args.maxTokens ?? 6000 };
  const knowledgeHash = readText(repoPath('.ai/manifests/hashes.json')) ?? 'unbuilt';
  const key = contextCacheKey({
    args: {
      task: normalized.task,
      maxTokens: normalized.maxTokens,
      mode: normalized.mode,
      service: normalized.service,
      event: normalized.event,
      route: normalized.route,
      files: normalized.files,
    },
    knowledgeHash,
  });
  if (!normalized.noCache && !normalized.refreshCache) {
    const cached = readContextCache(key);
    if (cached) return cached;
  }
  const context = resolveUncached(normalized);
  const cached = { ...context, cache: { status: 'HIT', key } };
  if (!normalized.noCache) writeContextCache(key, cached);
  return { ...context, cache: { status: normalized.noCache ? 'BYPASS' : 'MISS', key } };
}

function list(items) {
  return items.length > 0
    ? items
        .map((item) => `- ${typeof item === 'string' ? item : (item.file ?? item.name)}`)
        .join('\n')
    : '- (none matched)';
}

function toMarkdown(context) {
  return `<!-- GENERATED (local) by tools/knowledge/context.mjs — not committed. -->
# Task context: ${context.task || '(unspecified)'}

**Mode:** ${context.mode} · **Risk:** ${context.risk} · **Classification:** ${context.classification.pack}

## Mandatory constraints
${list(context.compiledConstraints.map((constraint) => `${constraint.kind}: ${constraint.text} [${constraint.source}]`))}

## Affected workspaces
${list(context.affectedWorkspaces.map((workspace) => `${workspace.name} — ${workspace.reason}`))}

## Relevant architecture
- Data ownership: each service owns its database; cross-service access uses HTTP or RabbitMQ.
- Layering: Controller → Service → Repository/Manager → Adapter.
- Shared contracts live in shared-types; shared values live in shared-constants.

## Likely source files
${list(context.likelySourceFiles)}

## Likely tests
${list(context.likelyTests)}

## Dependencies
${list(context.dependencies.map((edge) => `${edge.from} → ${edge.to}`))}

## Related contracts
Events:
${list(context.relatedEvents)}

Permissions:
${list(context.relatedPermissions)}

Environment:
${list(context.relatedEnvVars)}

Routes:
${list(context.relatedFrontendRoutes)}

## Required validation
${context.validationCommands.map((command) => `- \`${command}\``).join('\n')}

## Source references
Rules:
${list(context.governingRules)}

Skills:
${list(context.matchingSkills)}

## Missing / ambiguous
${list(context.missingInformation)}

## Efficiency
- Estimated context: ${context.efficiency.estimatedTokens} tokens
- Historical baseline: ${context.efficiency.baseline}
- Rules: ${context.efficiency.rulesLoaded}; skills: ${context.efficiency.skillsLoaded}
- Initial source files: ${context.efficiency.initialCodeFiles}; tests: ${context.efficiency.initialTestFiles}
- Search: ${context.sourceScope.strategy} across ${context.sourceScope.trackedFiles} tracked text files
- Cache: ${context.cache.status}

_Budget: ${context.budget.maxTokens} tokens. Expand progressively only when evidence requires it._
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const context = resolveContext(args);
  mkdirSync(repoPath('.ai/local'), { recursive: true });
  writeFileSync(repoPath('.ai/local/current-context.json'), stableStringify(context));
  writeFileSync(repoPath('.ai/local/current-context.md'), toMarkdown(context));
  console.log(`Resolved context for: "${args.task}"`);
  console.log(
    `  mode=${context.mode} · risk=${context.risk} · workspaces=${context.affectedWorkspaces.length} · files=${context.likelySourceFiles.length} · cache=${context.cache.status}`,
  );
  console.log('  → .ai/local/current-context.md');
}

if (isMain(import.meta.url)) main();
