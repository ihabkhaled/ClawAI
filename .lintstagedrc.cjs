const path = require('path');

const toForwardSlash = (p) => p.split(path.sep).join('/');

const buildEslintFixCommand = (fileNames) =>
  `eslint ${fileNames.map((f) => toForwardSlash(path.relative(process.cwd(), f))).join(' ')} --fix`;

const buildPrettierCommand = (fileNames) =>
  `prettier --write ${fileNames.map((f) => toForwardSlash(path.relative(process.cwd(), f))).join(' ')}`;

const buildGitAddCommand = (fileNames) =>
  `git add ${fileNames.map((f) => toForwardSlash(path.relative(process.cwd(), f))).join(' ')}`;

// Generated content — tools/knowledge/build.mjs is the only writer, and its
// output must stay byte-identical to what `npm run knowledge:check`
// recomputes. Letting prettier/eslint reformat it here would silently desync
// generated content from source, failing knowledge:check for a reason no
// human authored. Covers: everything under .ai/ (except .ai/local/, already
// gitignored), and every nested AGENTS.md (apps/*/AGENTS.md,
// packages/*/AGENTS.md) — the root AGENTS.md is hand-authored and NOT excluded.
const isGenerated = (f) => {
  const rel = toForwardSlash(f);
  return rel.includes('.ai/') || (rel.endsWith('/AGENTS.md') && rel !== 'AGENTS.md');
};

module.exports = {
  '*.{ts,tsx,js,jsx}': (files) => {
    // agent-cli is a standalone Node.js script — exclude from monorepo ESLint
    const filtered = files.filter((f) => !toForwardSlash(f).includes('agent-cli/') && !isGenerated(f));
    if (!filtered.length) return [];
    return [buildEslintFixCommand(filtered), buildGitAddCommand(filtered)];
  },
  '*.{ts,tsx,js,jsx,json,css,md,yml,yaml}': (files) => {
    const filtered = files.filter((f) => !isGenerated(f));
    if (!filtered.length) return [];
    return [buildPrettierCommand(filtered), buildGitAddCommand(filtered)];
  },
};
