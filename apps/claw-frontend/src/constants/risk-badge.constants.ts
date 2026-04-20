import { BadgeVariant, RiskLabel } from '../enums';

export const RISK_BADGE_VARIANTS: Record<RiskLabel, BadgeVariant> = {
  [RiskLabel.LOW]: BadgeVariant.SECONDARY,
  [RiskLabel.MEDIUM]: BadgeVariant.DEFAULT,
  [RiskLabel.HIGH]: BadgeVariant.DESTRUCTIVE,
  [RiskLabel.CRITICAL]: BadgeVariant.DESTRUCTIVE,
};
