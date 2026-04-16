export type InstalledModelInfo = {
  name: string;
  tag: string;
  roles: string[];
  parameterCount: string | null;
};

export type InstalledModelsResponse = {
  models: InstalledModelInfo[];
};

export type CachedPromptData = {
  prompt: string;
  generatedAt: number;
};
