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
