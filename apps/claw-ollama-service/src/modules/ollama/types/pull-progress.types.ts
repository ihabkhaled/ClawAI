export type PullProgressEvent = {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percentage: number;
};

export type PullProgressCallback = (event: PullProgressEvent) => void;
