/// <reference types="vitest/globals" />

// Vitest's global describe/it/expect/vi types.
//
// Referenced from a .d.ts rather than listed in tsconfig's `types`, because
// `typeRoots` here is restricted to @types folders and `vitest/globals` is a
// package subpath — it cannot resolve through typeRoots. A triple-slash
// reference uses ordinary module resolution, which finds it.
//
// Replaces the `"jest"` entry that `types` carried before the Vitest migration.
