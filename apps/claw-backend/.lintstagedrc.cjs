module.exports = {
  '*.ts': (filenames) => {
    const files = filenames.map((f) => f.replace(/\\/g, '/'));
    return [`eslint --fix ${files.join(' ')}`];
  },
  '*.{ts,json,md,yml,yaml}': (filenames) => {
    const files = filenames.map((f) => f.replace(/\\/g, '/'));
    return [`prettier --write ${files.join(' ')}`, `git add ${files.join(' ')}`];
  },
};
