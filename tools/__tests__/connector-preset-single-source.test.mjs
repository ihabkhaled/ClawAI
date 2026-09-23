import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { repoPath } from '../lib/repo.mjs';

// Enforcement for ADR-117: CONNECTOR_PRESETS is the ONLY place an
// OpenAI-compatible preset's display name or default base URL is written.
//
// It lives HERE, not beside the registry, for the same reason
// payg-surface-exhaustiveness does: `tools/affected` fans a package change out
// to its dependents but never checks every app for a re-typed copy, so a test
// living next to the registry would not run when some OTHER workspace grows a
// second copy of a name or URL. `npm run knowledge:test` runs this on every
// commit and push regardless of what changed.
//
// The failure this catches: an agent (or a human) adds a provider's display
// name or base URL directly in a frontend constants file or a service adapter
// instead of the registry, and the pack's "no base URL/display name duplicated
// outside the registry" requirement silently rots.

const REGISTRY_FILE = 'packages/shared-utilities/src/connector-presets/connector-presets.constants.ts';

/** Files allowed to name a preset's URL or display name: the registry and its own tests. */
const ALLOWED_FILES = new Set([
  REGISTRY_FILE,
  'packages/shared-utilities/src/connector-presets/__tests__/connector-presets.spec.ts',
]);

// Preset base-host fragments distinctive enough that a match elsewhere is real
// duplication, not a coincidence (excludes hosts also used by a bespoke
// provider or a research/search integration this test does not police).
const PRESET_HOST_FRAGMENTS = [
  'openrouter.ai',
  'api.groq.com',
  'api.cerebras.ai',
  'api.sambanova.ai',
  'api.deepinfra.com',
  'api.fireworks.ai',
  'api.together.xyz',
  'api.mistral.ai',
  'api.moonshot.ai',
  'api.moonshot.cn',
  'api.z.ai',
  'open.bigmodel.cn',
  'dashscope-intl.aliyuncs.com',
  'dashscope.aliyuncs.com',
  'ai-gateway.vercel.sh',
  'api.perplexity.ai',
  'api.cohere.ai',
  'api.cohere.com',
];

const PRESET_DISPLAY_NAMES = [
  'Cerebras Inference',
  'SambaNova Cloud',
  'Fireworks AI',
  'Together AI',
  'Moonshot AI (Kimi)',
  'Z.ai (Zhipu GLM)',
  'Alibaba Cloud Model Studio (Qwen)',
  'Cloudflare Workers AI',
  'Vercel AI Gateway',
  'Perplexity Sonar',
];

const SOURCE_ROOTS = ['apps', 'packages'];
const SOURCE_EXTENSIONS = ['.ts', '.tsx'];
const EXCLUDED_SEGMENTS = ['node_modules', 'dist', '.next', 'generated', '__tests__'];

function walk(dir, files) {
  for (const entry of readSortedDir(dir)) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (EXCLUDED_SEGMENTS.some((segment) => entry.name === segment)) continue;
      walk(full, files);
    } else if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts')) continue;
      files.push(full);
    }
  }
  return files;
}

function readSortedDir(dir) {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
}

function repoSourceFiles() {
  const files = [];
  for (const root of SOURCE_ROOTS) {
    for (const workspace of readSortedDir(repoPath(root))) {
      if (!workspace.isDirectory()) continue;
      const srcDir = repoPath(root, workspace.name, 'src');
      try {
        walk(srcDir, files);
      } catch {
        // No src/ (e.g. a workspace still scaffolding) — nothing to scan.
      }
    }
  }
  return files;
}

test('no preset base URL or display name is duplicated outside CONNECTOR_PRESETS', () => {
  const violations = [];
  for (const file of repoSourceFiles()) {
    const relativePath = file.slice(repoPath().length + 1).replaceAll('\\', '/');
    if (ALLOWED_FILES.has(relativePath)) continue;
    const text = readFileSync(file, 'utf8');
    for (const fragment of PRESET_HOST_FRAGMENTS) {
      if (text.includes(fragment)) {
        violations.push(`${relativePath} → ${fragment}`);
      }
    }
    for (const name of PRESET_DISPLAY_NAMES) {
      if (text.includes(`'${name}'`) || text.includes(`"${name}"`)) {
        violations.push(`${relativePath} → "${name}"`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test('the registry file exists and defines CONNECTOR_PRESETS', () => {
  const text = readFileSync(repoPath(REGISTRY_FILE), 'utf8');
  assert.match(text, /export const CONNECTOR_PRESETS/u);
});
