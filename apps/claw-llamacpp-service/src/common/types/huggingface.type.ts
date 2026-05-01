export interface HFFile {
  name: string;
  size: number;
  sha256: string | null;
  oid: string | null;
}

export interface HFRepoInfo {
  id: string;
  tags: string[];
  license: string | null;
}
