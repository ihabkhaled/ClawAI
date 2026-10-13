import { RESEARCH_MODES } from '@/constants/research.constants';
import type { ResearchMode } from '@/enums/research-mode.enum';
import type { TranslateFunction } from '@/types/i18n.types';

/** The translated name of a research mode, or the raw value when the mode is unknown. */
export function resolveResearchModeLabel(mode: ResearchMode, t: TranslateFunction): string {
  const labelKey = RESEARCH_MODES.find((option) => option.value === mode)?.labelKey;
  return labelKey === undefined ? mode : t(labelKey);
}
