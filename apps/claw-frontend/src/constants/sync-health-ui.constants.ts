import { FreshnessBand } from '../enums/freshness-band.enum';

export const FRESHNESS_BAND_CLASSNAME: Record<FreshnessBand, string> = {
  [FreshnessBand.FRESH]: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
  [FreshnessBand.SLOW]: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  [FreshnessBand.STALE]: 'bg-red-500/15 text-red-400 border-red-500/40',
};
