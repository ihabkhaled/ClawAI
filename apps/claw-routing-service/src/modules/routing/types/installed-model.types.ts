export type InstalledModelInfo = {
  name: string;
  tag: string;
  category: string;
  roles: string[];
  capabilities: string[];
  parameterCount: string;
};

export type InstalledModelsResponse = {
  models: InstalledModelInfo[];
};

export type CachedPromptData = {
  prompt: string;
  generatedAt: number;
};
