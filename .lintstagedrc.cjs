const path = require('path');

const toForwardSlash = (p) => p.split(path.sep).join('/');

// A commit spanning two workspaces makes ESLint load BOTH tsconfig projects in
// a single process, and typed linting holds the whole program graph in memory.
// On the default ~4 GB heap that reliably dies with
// "FATAL ERROR: Ineffective mark-compacts near heap limit" — which reads like a
// broken commit but is really just the hook running out of room. CI already
// raises this for the same reason (ci.yml sets NODE_OPTIONS on the build job);
// the hook needs the same headroom to stay honest, because a gate that OOMs is
// a gate people learn to bypass.
const ESLINT_HEAP_MB = 8192;

// Invoked as `node --max-old-space-size=… <bin>` rather than plain `eslint`,
// because lint-staged runs commands without a shell, so an inline
// `NODE_OPTIONS=…` prefix would be parsed as part of the command name.
// ESLint 10 does not expose ./bin/eslint.js through package `exports`, so the
// path is resolved from the package root instead of require.resolve.
const ESLINT_BIN = path.join('node_modules', 'eslint', 'bin', 'eslint.js');

// Chunked for the same reason as prettier below: a few hundred paths overflow
// the Windows command line. `--fix` is chunk-safe — each invocation lints the
// files it was handed.
const buildEslintFixCommands = (fileNames) => {
  // Fall back to the plain binary if the layout ever moves; a hook that cannot
  // find ESLint should still lint rather than silently pass.
  const prefix = require('fs').existsSync(path.join(process.cwd(), ESLINT_BIN))
    ? `node --max-old-space-size=${ESLINT_HEAP_MB} ${toForwardSlash(ESLINT_BIN)} `
    : 'eslint ';
  return buildChunkedCommands(fileNames, prefix).map((command) => `${command} --fix`);
};

// Windows caps a command line at 8191 characters, and `prettier` and `git`
// both resolve through a .cmd shim, so the whole argument list goes through
// cmd.exe. A commit touching a few hundred files blows that cap and fails with
// "The command line is too long" — which reads like a broken hook and is really
// just an OS limit. lint-staged accepts an ARRAY of commands, so the fix is to
// chunk rather than to split the commit: a flagship change should not have to
// be fragmented into arbitrary pieces to get past an argv limit.
//
// Sized off the longest path actually present rather than a guessed average,
// so one very deep path cannot push a chunk over on its own.
const MAX_COMMAND_LINE_CHARS = 7000;

const chunkByCommandLength = (fileNames, prefix) => {
  const chunks = [];
  let current = [];
  let length = prefix.length;
  for (const file of fileNames) {
    const cost = file.length + 1;
    if (current.length > 0 && length + cost > MAX_COMMAND_LINE_CHARS) {
      chunks.push(current);
      current = [];
      length = prefix.length;
    }
    current.push(file);
    length += cost;
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
};

const buildChunkedCommands = (fileNames, prefix) =>
  chunkByCommandLength(
    fileNames.map((f) => toForwardSlash(path.relative(process.cwd(), f))),
    prefix,
  ).map((chunk) => `${prefix}${chunk.join(' ')}`);

const buildPrettierCommands = (fileNames) => buildChunkedCommands(fileNames, 'prettier --write ');

const buildGitAddCommands = (fileNames) => buildChunkedCommands(fileNames, 'git add ');

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
    return [...buildEslintFixCommands(filtered), ...buildGitAddCommands(filtered)];
  },
  '*.{ts,tsx,js,jsx,json,css,md,yml,yaml}': (files) => {
    const filtered = files.filter((f) => !isGenerated(f));
    if (!filtered.length) return [];
    return [...buildPrettierCommands(filtered), ...buildGitAddCommands(filtered)];
  },
};
