/**
 * How many context packs one chat may carry. Mirrors chat-service's
 * `contextPackIds` bound (`max(10)` in the create/update thread DTOs); a pick
 * past it would 400 on save, so the picker stops at it instead.
 */
export const COMPOSER_CONTEXT_PACKS_MAX = 10;

/** A stable empty selection, so "nothing attached" is one reference and not a fresh array per render. */
export const EMPTY_PACK_IDS: string[] = [];
