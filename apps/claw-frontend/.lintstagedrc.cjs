const path = require('path');

/**
 * Convert Windows backslash paths to forward slashes for CLI tools.
 */
function toForwardSlash(filePath) {
  return filePath.split(path.sep).join('/');
}

module.exports = {
  '*.{ts,tsx,js,jsx}': (filenames) => {
    const files = filenames.map(toForwardSlash).join(' ');
    return [`eslint --fix ${files}`];
  },
  '*.{ts,tsx,js,jsx,json,css,md,yml,yaml}': (filenames) => {
    const files = filenames.map(toForwardSlash).join(' ');
    return [`prettier --write ${files}`, `git add ${files}`];
  },
};
