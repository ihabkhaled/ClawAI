export function resolveSearchBrowserScoreTone(score: number): string {
  if (score >= 0.9) {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
  }
  if (score >= 0.7) {
    return 'border-sky-500/40 bg-sky-500/10 text-sky-400';
  }
  return 'border-amber-500/40 bg-amber-500/10 text-amber-400';
}
