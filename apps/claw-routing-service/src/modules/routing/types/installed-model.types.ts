export type InstalledModelInfo = {
  name: string;
  tag: string;
  category: string | null;
  roles: string[];
  capabilities: string[];
  parameterCount: string | null;
};

export type InstalledModelsResponse = {
  models: InstalledModelInfo[];
};

export type CachedPromptData = {
  prompt: string;
  generatedAt: number;
};
