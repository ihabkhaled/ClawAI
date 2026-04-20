#!/usr/bin/env node
// Deprecated entry point — delegates to src/bin/claw-agent.js.
// Will be removed at the end of Phase A (see docs/13-adr/adr-015-desktop-agent-auth-model.md).
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const newEntry = join(here, 'src', 'bin', 'claw-agent.js');
await import(pathToFileURL(newEntry).href);
