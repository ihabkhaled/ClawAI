/** Recent step-log outcomes of one provider/model (the counts the healing ranking uses). */
export type ModelHealthEntry = { provider: string; model: string; ok: number; failed: number };

export type ModelHealthReport = { windowMs: number; models: ModelHealthEntry[] };
