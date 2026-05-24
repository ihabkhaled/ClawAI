/**
 * Capability provider registry.
 *
 * Maps each CapabilityClass to its CLI-side provider. Streams 11/12/22
 * (FILESYSTEM/PROCESS/NOTIFICATION+CLIPBOARD) ship full implementations;
 * 20/21/23/24 (BROWSER/SCREEN/APPLICATION/AUDIO) ship as scaffolds that
 * throw a typed "not yet implemented" error so the framework end-to-end
 * flow is testable even before the OS-specific backends land.
 *
 * Each provider exports `{ execute({operation, target, payload, invocationId}) }`
 * returning `{ output?, undoPlan?, noUndoReason? }`.
 */

import { applicationProvider } from './application/index.js';
import { audioProvider } from './audio/index.js';
import { browserProvider } from './browser/index.js';
import { clipboardProvider } from './clipboard/index.js';
import { filesystemProvider } from './filesystem/index.js';
import { notificationProvider } from './notification/index.js';
import { processProvider } from './process/index.js';
import { screenProvider } from './screen/index.js';
import { systemProvider } from './system/index.js';
import { terminalProvider } from './terminal/index.js';

export const providerRegistry = new Map([
  ['TERMINAL', terminalProvider],         // Stream 10 — full
  ['FILESYSTEM', filesystemProvider],     // Stream 11 — full
  ['PROCESS', processProvider],           // Stream 12 — full
  ['BROWSER', browserProvider],           // Stream 20 — full (lazy Playwright)
  ['SCREEN', screenProvider],             // Stream 21 — full (capture + tesseract OCR)
  ['CLIPBOARD', clipboardProvider],       // Stream 22 — text + READ_IMAGE/WRITE_IMAGE
  ['NOTIFICATION', notificationProvider], // Stream 22 — minimal
  ['APPLICATION', applicationProvider],   // Stream 23 — full (nut-tree)
  ['AUDIO', audioProvider],               // Stream 24 — full (whisper + piper)
  ['SYSTEM', systemProvider],             // V2 Stream 09 — LOCK/SUSPEND/NETWORK_INFO/DISK_USAGE/TIMEZONE
]);
