export interface LlamacppHealthResponse {
  binary?: { installed?: boolean };
  activeModel?: {
    id?: string;
    name?: string;
    tag?: string;
    loadStatus?: string;
  } | null;
}

export interface LlamacppCatalogEntryDto {
  id: string;
  name: string;
  tag: string;
  displayName: string;
  category: string;
  contextLength?: number;
  capabilities?: string[];
  downloadStatus: string;
  loadStatus: string;
}

export interface LlamacppCatalogResponse {
  rows: LlamacppCatalogEntryDto[];
  total: number;
}
