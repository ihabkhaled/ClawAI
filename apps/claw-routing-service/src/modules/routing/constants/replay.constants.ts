export const COST_RANK: Record<string, number> = { free: 0, low: 1, medium: 2, high: 3 };

export const CONFIDENCE_IMPROVEMENT_THRESHOLD = 0.05;
export const CONFIDENCE_QUALITY_WIN_THRESHOLD = 0.15;
export const CONFIDENCE_REGRESSION_THRESHOLD = -0.1;
export const SUSPICIOUS_CONFIDENCE_DROP = -0.2;
export const SUSPICIOUS_COST_RANK_JUMP = 2;
