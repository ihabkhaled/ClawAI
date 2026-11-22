export type PolicyVersionView = {
  version: number;
  active: boolean;
  config: unknown;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type PolicyOverviewView = {
  active: PolicyVersionView | null;
  versions: PolicyVersionView[];
};

export type StoredPolicyVersion = {
  version: number;
  activeKey: string | null;
  config: unknown;
  note: string | null;
  createdBy: string | null;
  createdAt: Date;
};
