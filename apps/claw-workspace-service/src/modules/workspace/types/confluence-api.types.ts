export type ConfluenceResource = {
  id: string;
  url: string;
  name: string;
  scopes: string[];
};

export type ConfluencePage = {
  id: string;
  type: string;
  title: string;
  status: string;
  _links: { webui?: string; self?: string };
  history?: {
    createdBy?: { accountId?: string; displayName?: string };
    createdDate?: string;
  };
  version?: { when?: string; number?: number };
  body?: { storage?: { value?: string } };
  space?: { key?: string; name?: string };
};

export type ConfluenceSearchResponse = {
  results: ConfluencePage[];
  _links?: { base?: string };
};

export type AtlassianTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};
