export interface HfApiModelListItem {
  id: string;
  author?: string;
  downloads?: number;
  likes?: number;
  lastModified?: string;
  tags?: string[];
  pipeline_tag?: string;
  gated?: boolean | string;
  private?: boolean;
}

export interface HfApiSibling {
  rfilename: string;
  size?: number;
}

export interface HfApiModelDetail extends HfApiModelListItem {
  siblings?: HfApiSibling[];
}

// `GET /api/models/<repo>?expand[]=gguf`: the GGUF file's own metadata. Every field is a third
// party's, so each is `unknown` until `parseGgufContextLength` checks it.
export interface HfApiGgufDetail {
  gguf?: {
    context_length?: unknown;
  };
}

export type HfApiTreeEntryType = 'file' | 'directory';

export interface HfApiTreeEntry {
  type: HfApiTreeEntryType;
  path: string;
  size?: number;
}

export interface HfOnboardingPayload {
  name: string;
  tag: string;
  displayName: string;
  huggingfaceRepo: string;
  filePattern: string;
  fileSizeBytes: bigint;
  sourceUrl: string;
  description: string;
}

export interface HfParameterHint {
  label: string;
  billions: number;
}
