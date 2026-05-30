import type { TranslateFunction } from './i18n.types';
import type { RuntimeProbeReport } from './runtime-probe-report.types';
import type { UserProfile } from './user.types';

// Result shape returned by the controller hook for the admin runtime
// diagnostics page (/admin/runtime-progress). Each probe is exposed as an
// independent query so a failure on one runtime never blocks the other.
export type RuntimeProgressProbeState = {
  data: RuntimeProbeReport | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRefresh: () => void;
};

export type UseRuntimeProgressPageReturn = {
  t: TranslateFunction;
  user: UserProfile | null;
  isAdmin: boolean;
  ollama: RuntimeProgressProbeState;
  llamacpp: RuntimeProgressProbeState;
  lastUpdatedAt: number | null;
  isRefreshing: boolean;
  onRefreshAll: () => void;
};

// Props for the per-runtime probe card on the diagnostics page. `titleKey` is
// the i18n key looked up at render time so the card stays runtime-agnostic.
export type RuntimeProbeCardProps = {
  titleKey: string;
  report: RuntimeProbeReport | undefined;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
};

export type RuntimeProbeStatusIconProps = {
  status: RuntimeProbeReport['status'] | undefined;
};

export type RuntimeProbeCapabilityRowProps = {
  labelKey: string;
  enabled: boolean | undefined;
};

export type RuntimeProbeCapabilitiesListProps = {
  capabilities: RuntimeProbeReport['capabilities'];
};

export type RuntimeProbeModelRowProps = {
  model: NonNullable<RuntimeProbeReport['models']>[number];
  isActive: boolean;
};

export type RuntimeProbeEventRowProps = {
  event: NonNullable<RuntimeProbeReport['recentEvents']>[number];
};
