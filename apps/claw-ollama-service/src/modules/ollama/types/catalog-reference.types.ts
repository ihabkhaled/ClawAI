import type { RuntimeType } from '../../../generated/prisma';

export type CatalogReferenceInput = {
  name: string;
  tag: string;
  runtime: RuntimeType;
  ollamaName?: string | null;
  sourceUrl?: string | null;
};

export type OllamaModelReference = {
  slug: string;
  tag: string;
  pullName: string;
  sourceUrl: string;
  manifestPath: string;
};

export type OllamaModelNameParts = {
  modelName: string;
  tag: string;
};
