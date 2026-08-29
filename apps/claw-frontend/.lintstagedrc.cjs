const path = require('path');

/**
 * Convert Windows backslash paths to forward slashes for CLI tools.
 */
function toForwardSlash(filePath) {
  return filePath.split(path.sep).join('/');
}

/**
 * Windows caps a command line at 8191 characters, and lint-staged hands this
 * config ABSOLUTE paths — roughly 70 characters each in this workspace. A
 * commit touching a hundred frontend files therefore dies with "The command
 * line is too long", which reads like a broken hook and is really just an OS
 * limit.
 *
 * lint-staged accepts an ARRAY of commands, so the fix is to chunk rather than
 * to fragment the commit: a change that legitimately spans the UI should not
 * have to be split into arbitrary pieces to get past argv.
 *
 * Kept in step with the root `.lintstagedrc.cjs`, which does the same thing for
 * the rest of the monorepo. Both configs run on a frontend commit.
 */
const MAX_COMMAND_LINE_CHARS = 7000;

function chunkByCommandLength(fileNames, prefix) {
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
}

// Paths stay ABSOLUTE on purpose. lint-staged loads this config from the repo
// root but runs its tasks with the cwd set to this workspace, so a path made
// relative at config time resolves against the wrong directory and every tool
// reports "No files matching the pattern". Absolute paths cost roughly twice
// the characters, which is exactly what the chunking above is for.
function buildChunkedCommands(fileNames, prefix) {
  const absolute = fileNames.map(toForwardSlash);
  return chunkByCommandLength(absolute, prefix).map((chunk) => `${prefix}${chunk.join(' ')}`);
}

module.exports = {
  '*.{ts,tsx,js,jsx}': (filenames) => buildChunkedCommands(filenames, 'eslint --fix '),
  '*.{ts,tsx,js,jsx,json,css,md,yml,yaml}': (filenames) => [
    ...buildChunkedCommands(filenames, 'prettier --write '),
    ...buildChunkedCommands(filenames, 'git add '),
  ],
};
