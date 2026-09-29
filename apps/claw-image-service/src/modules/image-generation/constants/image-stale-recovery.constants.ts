import { type PaygReleaseReason } from '@claw/shared-entitlements';

import { COMFYUI_MAX_EXECUTION_MS } from '../../runtime-progress/constants/comfyui.constants';
import { OPENAI_EDIT_TIMEOUT_MS } from './image-edit.constants';
import { GEMINI_IMAGE_TIMEOUT_MS } from './gemini-image.constants';
import { SD_TIMEOUT_MS } from './stable-diffusion.constants';
import { XAI_IMAGE_TIMEOUT_MS } from './xai-image.constants';

/**
 * The longest a live attempt can sit in one status without touching its row:
 * the slowest provider deadline this service enforces (ComfyUI's 5 min
 * execution cap today). A row is written on every status change, so a running
 * job never stays unchanged much past this.
 */
export const IMAGE_LONGEST_PROVIDER_DEADLINE_MS = Math.max(
  COMFYUI_MAX_EXECUTION_MS,
  SD_TIMEOUT_MS,
  OPENAI_EDIT_TIMEOUT_MS,
  GEMINI_IMAGE_TIMEOUT_MS,
  XAI_IMAGE_TIMEOUT_MS,
);

/**
 * Headroom on top of the provider deadline for the work around the call:
 * connector lookup, reference read-back, the file-service store and the asset
 * row. Generous on purpose — timing out a live job is worse than a slow spinner.
 */
export const IMAGE_STALE_JOB_MARGIN_MS = 5 * 60 * 1000;

/** A non-terminal row untouched for longer than this has no live process behind it. */
export const IMAGE_STALE_JOB_THRESHOLD_MS =
  IMAGE_LONGEST_PROVIDER_DEADLINE_MS + IMAGE_STALE_JOB_MARGIN_MS;

/**
 * At boot every in-progress row belongs to the process that just died
 * (image-service runs ONE replica — fixed container_name, no deploy.replicas),
 * so the boot sweep only waits this long, not the full threshold.
 */
export const IMAGE_BOOT_RECOVERY_GRACE_MS = 5_000;

/** How often the periodic sweep runs. One tick at a time; a busy tick skips the next. */
export const IMAGE_STALE_SWEEP_INTERVAL_MS = 60_000;

/** Rows recovered per sweep. The next tick picks up the rest. */
export const IMAGE_STALE_SWEEP_BATCH_SIZE = 100;

/** auth-service release reason for the hold of a job whose process died. */
export const IMAGE_STALE_RELEASE_REASON: PaygReleaseReason = 'TIMEOUT';

/** What the settlement log line names as the cause of that release. */
export const IMAGE_STALE_LOG_REASON = 'PROCESS_DIED';

/**
 * The columns a recovery needs — including `paygReservationId`, which the
 * client omits from every other read (PRISMA_GLOBAL_OMIT).
 */
export const IMAGE_STALE_JOB_SELECT = {
  id: true,
  userId: true,
  prompt: true,
  provider: true,
  model: true,
  status: true,
  paygReservationId: true,
} as const;
