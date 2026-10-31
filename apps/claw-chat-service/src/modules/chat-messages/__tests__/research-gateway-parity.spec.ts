import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// The research gateway guard (rules/50, rules/59, ADR-212). Search is ONE pipeline: one
// client, one set of timeouts, one error mapping. This reads the source on purpose: a
// surface that grows its own research-service call (the way five private copies grew,
// each with a different timeout that cut slow providers off) fails here.

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHAT = join(SRC_ROOT, 'modules', 'chat-messages');

/** The only files allowed to know where research-service is and how to call it. */
const GATEWAY_FILES: readonly string[] = [
  'modules/chat-messages/utilities/research-gateway.utility.ts',
  'common/utilities/research-client.utility.ts',
  'app/config/app.config.ts',
  'common/constants/research-client.constants.ts',
];

const DIRECT_CLIENT_PATTERNS: readonly RegExp[] = [
  /RESEARCH_SERVICE_URL/u,
  /\/api\/v1\/research/u,
  /\/internal\/research/u,
  /\brunResearch\s*\(/u,
  /\bfetchPageViaResearch\s*\(/u,
];

function walk(dir: string, out: string[] = []): string[] {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed in-repo source tree
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed in-repo source tree
    if (statSync(full).isDirectory()) {
      if (name !== '__tests__' && name !== 'node_modules') {
        walk(full, out);
      }
    } else if (full.endsWith('.ts') && !full.endsWith('.spec.ts') && !full.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

/** Comments describe history on purpose; only executable text counts. */
function code(path: string): string {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed in-repo source file
  return readFileSync(path, 'utf8')
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/^\s*\/\/.*$/gm, '');
}

/** True when `source` contains a call `symbol(`, matched on the whole identifier. */
const callsSymbol = (source: string, symbol: string): boolean =>
  [...source.matchAll(/\b(\w+)\s*\(/gu)].some((match) => match[1] === symbol);

const chatSource = (relativePath: string): string => code(join(CHAT, relativePath));

describe('the research gateway is the only research client', () => {
  it('no file outside the gateway talks to research-service directly', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      const name = relative(SRC_ROOT, file).split(sep).join('/');
      if (GATEWAY_FILES.includes(name)) {
        continue;
      }
      const text = code(file);
      for (const pattern of DIRECT_CLIENT_PATTERNS) {
        if (pattern.test(text)) {
          offenders.push(`${name} matches ${pattern.source}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps exactly one set of research timeouts: no surface declares its own', () => {
    const offenders: string[] = [];
    for (const file of walk(CHAT)) {
      if (/(?:research|search)[a-z-]*\.constants\.ts$/u.test(file)) {
        const text = code(file);
        if (/(?:SEARCH|FETCH|RESEARCH)[A-Z_]*TIMEOUT_MS\s*=/u.test(text)) {
          offenders.push(relative(SRC_ROOT, file).split(sep).join('/'));
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('every surface reaches the web through the gateway', () => {
  const expectations: ReadonlyArray<[string, string, string]> = [
    [
      'managers/research-enricher.manager.ts',
      'gatewaySearch',
      'Compare + 9 orchestration managers',
    ],
    [
      'managers/research-enricher.manager.ts',
      'gatewayFetchPages',
      'Compare + 9 orchestration managers',
    ],
    ['managers/search-first.manager.ts', 'gatewaySearchForUser', 'search-first workflow'],
    ['managers/research-orchestrator.manager.ts', 'gatewayRun', 'AUTO research'],
    ['managers/context-assembly.manager.ts', 'gatewayRun', 'labs / gateway context'],
    ['services/chat-messages.service.ts', 'gatewayRun', 'explicit research modes'],
    ['utilities/ollama-cloud-tool-runner.utility.ts', 'gatewaySearchForUser', 'web_search tool'],
    ['utilities/ollama-cloud-tool-runner.utility.ts', 'gatewayToolFetch', 'web_fetch tool'],
  ];

  it.each(expectations)('%s calls %s (%s)', (file, symbol) => {
    expect(callsSymbol(chatSource(file), symbol)).toBe(true);
  });

  it('the tool dispatcher sends web_search to the research-backed runner', () => {
    expect(chatSource('managers/chat-execution.manager.ts')).toMatch(
      /executeResearchWebSearch\s*\(/u,
    );
  });

  it('a model turn runs its independent tool calls through the bounded parallel map', () => {
    expect(chatSource('managers/chat-execution.manager.ts')).toMatch(/mapWithConcurrency\s*\(/u);
  });
});

describe('the answer stream starts only after research resolved', () => {
  const ORCHESTRATION = [
    'answer-repair',
    'task-decomposition',
    'best-of-n',
    'verifier',
    'pipeline',
    'cost-ensemble',
    'role-pack',
    'consensus-execution',
    'escalation-chain',
  ];

  it.each(ORCHESTRATION)('%s awaits the enricher before it calls a model', (name) => {
    const text = chatSource(`managers/${name}.manager.ts`);
    expect(text).toMatch(/await this\.researchEnricherManager\.enrichForOrchestration\(/u);
    expect(text).not.toMatch(/void this\.researchEnricherManager/u);
  });

  it('Compare awaits its enrichment before the lanes fan out', () => {
    const text = chatSource('managers/parallel-execution.manager.ts');
    expect(text).toMatch(/await this\.applyResearchEnrichment\(/u);
    expect(text).toMatch(/await this\.researchEnricherManager\.enrich\(/u);
  });

  it('search-first is awaited before the model call', () => {
    expect(chatSource('managers/chat-execution.manager.ts')).toMatch(
      /await this\.maybeRunSearchFirst\(/u,
    );
  });

  it('normal chat publishes the turn to the answering model only after research settled', () => {
    const text = chatSource('services/chat-messages.service.ts');
    const body = text.slice(text.indexOf('private async runResearchThenPublish('));
    const awaited = body.indexOf('await this.runResearchIfRequested(');
    const published = body.indexOf('publish()');
    expect(awaited).toBeGreaterThan(-1);
    expect(published).toBeGreaterThan(awaited);
    // `finally`: a research failure or timeout never leaves the turn waiting forever.
    expect(body.slice(awaited, published)).toMatch(/finally\s*\{/u);
  });

  it('context assembly awaits its research with the rest of the sources', () => {
    const text = chatSource('managers/context-assembly.manager.ts');
    expect(text).toMatch(/await Promise\.all\(\[[\s\S]*?this\.fetchResearchEvidence\(/u);
  });
});
