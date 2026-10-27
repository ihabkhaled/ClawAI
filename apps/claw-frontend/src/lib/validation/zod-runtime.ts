import { z } from 'zod';

/**
 * The browser runs under a Content-Security-Policy without 'unsafe-eval' (middleware.ts). Zod 4
 * probes `Function("")` the first time it parses an object to decide whether it may compile
 * validators; the probe is caught, but Chrome still logs a CSP violation, which fails the
 * Lighthouse "Issues logged in the Issues panel" audit on every page that validates anything.
 * Interpreted validation is correct and fast enough in the browser, so JIT is switched off there.
 * Import this module (for its side effect) before the first parse, from client code only.
 */
z.config({ jitless: true });

export const ZOD_JITLESS_IN_BROWSER = true;
