import type { PaygHold } from '@claw/shared-entitlements';
import { PAYG_EXEMPT_PROVIDERS } from '@claw/shared-constants';
import { PaygSurface, type TokenLedgerContext } from '@claw/shared-types';

import {
  FILE_GENERATION_PROVIDER,
  IMAGE_PROVIDER_PREFIX,
} from '../../../common/constants/execution.constants';
import { recordGet } from '../../../common/utilities/record-lookup.utility';
import { PAYG_PROVIDER_ALIASES, PAYG_SURFACE_BY_TOKEN_CONTEXT } from '../constants/payg.constants';

/**
 * Rewrites a runtime provider tag to the connector provider auth-service knows.
 *
 * Unknown names pass through untouched: a provider this map has not heard of
 * must reach the meter and be classified there, never be quietly treated as
 * free.
 */
export function normalizePaygProvider(provider: string): string {
  return recordGet(PAYG_PROVIDER_ALIASES, provider) ?? provider;
}

/**
 * True for the two pseudo-providers that are not models at all.
 *
 * `IMAGE_*` and `FILE_GENERATION` are dispatched to image-service and
 * file-generation-service, which meter their own provider calls. Reserving here
 * as well would debit the same generation twice, and the response carries no
 * token usage to reconcile the second hold against. The text call that writes a
 * file's contents is a different thing and IS metered — it goes to a real
 * provider through the ordinary chokepoint.
 */
export function isPaygDelegatedProvider(provider: string): boolean {
  return provider === FILE_GENERATION_PROVIDER || provider.startsWith(IMAGE_PROVIDER_PREFIX);
}

/** The surface a call belongs to, from the ledger context it already carries. */
export function paygSurfaceForTokenContext(context: TokenLedgerContext): PaygSurface {
  return recordGet(PAYG_SURFACE_BY_TOKEN_CONTEXT, context) ?? PaygSurface.CHAT;
}

/**
 * The mode name recorded beside the surface, so "where did my $5 go" is
 * answerable at finer grain than "orchestration".
 */
export function paygWorkflowForTokenContext(context: TokenLedgerContext): string {
  return String(context).toLowerCase();
}

/**
 * True when the provider runs on hardware the operator or the user already owns.
 *
 * Used for ONE decision only: what to do when a call reaches the chokepoint
 * with no user to bill. A local model proceeds, a paid one is refused. The
 * metered set is never decided here — that is auth-service's alone (ADR-082),
 * and this asks the opposite question against a frozen list of two.
 */
export function isPaygExemptProvider(provider: string): boolean {
  const normalized = normalizePaygProvider(provider).toUpperCase();
  return PAYG_EXEMPT_PROVIDERS.some((exempt) => exempt.toUpperCase() === normalized);
}

/**
 * The hold a call carries when nothing was reserved for it.
 *
 * `maxOutputTokens` is still the ceiling the caller asked for, so a call site
 * never has to branch on `metered` before deciding what to send the provider —
 * it always sends `hold.maxOutputTokens`. Finalize and release are no-ops on
 * this shape.
 */
export function paygUnmeteredHold(maxOutputTokens: number): PaygHold {
  return {
    metered: false,
    maxOutputTokens,
    clamped: false,
    reservationId: null,
    heldMicroUsd: 0,
    availableAfterMicroUsd: 0,
    reason: 'NOT_PAYG',
  };
}
