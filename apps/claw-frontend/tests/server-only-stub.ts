// `server-only` is a Next.js build-time guard: importing it makes the build
// fail if a client component ever pulls the module in. It has no runtime body
// and no package entry the test runner can resolve, so vitest aliases it here.
//
// Stubbing it does NOT weaken the guard — the guard runs in `next build`, which
// resolves the real package. This only stops the test runner tripping over an
// import that exists to fail a different tool.
export {};
