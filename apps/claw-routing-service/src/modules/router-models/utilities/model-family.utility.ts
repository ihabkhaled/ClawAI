import { DATED_SNAPSHOT_SUFFIX } from '../constants/model-cost.constants';

/**
 * Drops a trailing release date, leaving the model family.
 *
 * `claude-haiku-4-5-20251001` -> `claude-haiku-4-5`
 * `gpt-4o-2024-08-06`         -> `gpt-4o`
 *
 * A dated snapshot is the SAME model pinned to a release, so it carries the
 * family's price. Refusing one as unpriced is a lookup miss, not a pricing gap —
 * and it was refusing real requests: `claude-haiku-4-5` is seeded,
 * `claude-haiku-4-5-20251001` is what the connector actually exposes.
 *
 * DELIBERATELY NARROW. Only a trailing 8-digit or `YYYY-MM-DD` date is removed.
 * A version (`-4-6`), a size (`:120b`) or a variant (`-mini`) names a DIFFERENT
 * model at a different price, and collapsing those would under-charge — the one
 * direction that lets a user outspend their credit. An explicitly published
 * price for the dated key always wins, because the caller tries the exact match
 * first.
 */
export function stripDatedSnapshot(modelKey: string): string {
  return modelKey.replace(DATED_SNAPSHOT_SUFFIX, '');
}
