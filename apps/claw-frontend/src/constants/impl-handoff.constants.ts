import { ImplHandoffMode } from '@/enums/impl-handoff-mode.enum';

export const IMPL_HANDOFF_MODES: readonly ImplHandoffMode[] = [
  ImplHandoffMode.CHAT,
  ImplHandoffMode.AGENT,
  ImplHandoffMode.CLIPBOARD,
] as const;
