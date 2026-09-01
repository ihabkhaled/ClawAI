// Jest still runs as CommonJS (its `jest.mock`/`jest.fn` globals rely on that,
// and switching Jest itself to ESM breaks those globals in every spec file --
// see the migration note in jest.config.ts). @nestjs/* is ESM-only as of v12,
// so this repo's one remaining CJS-vs-ESM seam is transforming that package's
// compiled JS back to CommonJS on the fly, for tests only. Source .ts files
// are untouched -- they still go through ts-jest, not this config.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]],
  // preset-env's commonjs transform does not cover `import.meta` (a separate
  // proposal from the module-system transform); @nestjs/common's
  // load-package.util.js uses it, so it needs its own plugin.
  plugins: ['babel-plugin-transform-import-meta'],
};
