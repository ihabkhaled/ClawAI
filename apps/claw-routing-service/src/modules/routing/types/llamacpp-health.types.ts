export interface LlamacppLoadedModel {
  id: string;
  name: string;
  tag: string;
  loadStatus: string;
  port: number | null;
}

export interface LlamacppHealthState {
  binaryReady: boolean;
  loadedModel: LlamacppLoadedModel | null;
  reachable: boolean;
  lastProbedAt: string;
}

export interface LlamacppHealthResponse {
  binary?: { installed?: boolean };
  activeModel?: {
    id?: string;
    name?: string;
    tag?: string;
    loadStatus?: string;
    port?: number | null;
  } | null;
}
