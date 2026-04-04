const path = require('path');

const toForwardSlash = (p) => p.split(path.sep).join('/');

const buildPrettierCommand = (fileNames) =>
  `prettier --write ${fileNames.map((f) => toForwardSlash(path.relative(process.cwd(), f))).join(' ')}`;

module.exports = {
  '*.{ts,tsx,js,jsx,json,css,md,yml,yaml}': (files) => {
    if (!files.length) return [];
    return [buildPrettierCommand(files)];
  },
};
