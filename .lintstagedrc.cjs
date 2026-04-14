const path = require('path');

const toForwardSlash = (p) => p.split(path.sep).join('/');

const buildEslintFixCommand = (fileNames) =>
  `eslint ${fileNames.map((f) => toForwardSlash(path.relative(process.cwd(), f))).join(' ')} --fix`;

const buildPrettierCommand = (fileNames) =>
  `prettier --write ${fileNames.map((f) => toForwardSlash(path.relative(process.cwd(), f))).join(' ')}`;

const buildGitAddCommand = (fileNames) =>
  `git add ${fileNames.map((f) => toForwardSlash(path.relative(process.cwd(), f))).join(' ')}`;

module.exports = {
  '*.{ts,tsx,js,jsx}': (files) => {
    // agent-cli is a standalone Node.js script — exclude from monorepo ESLint
    const filtered = files.filter((f) => !toForwardSlash(f).includes('agent-cli/'));
    if (!filtered.length) return [];
    return [buildEslintFixCommand(filtered), buildGitAddCommand(filtered)];
  },
  '*.{ts,tsx,js,jsx,json,css,md,yml,yaml}': (files) => {
    if (!files.length) return [];
    return [buildPrettierCommand(files), buildGitAddCommand(files)];
  },
};
