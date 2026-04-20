import type { ModelCategory } from '../../../generated/prisma';

export type SearchBrowserClassifierInput = {
  name: string;
  displayName: string;
  description: string | null;
  parameterCount: string | null;
  category: ModelCategory;
  capabilities: readonly string[];
  downloadStatus: string;
};

export type SearchBrowserClassifierResult = {
  score: number;
  reasons: string[];
  eligible: boolean;
};
