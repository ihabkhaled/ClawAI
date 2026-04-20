export type MicrosoftTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export type GraphDriveItem = {
  id: string;
  name: string;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  size?: number;
  file?: { mimeType: string };
  folder?: { childCount?: number };
  createdBy?: { user?: { displayName?: string; id?: string } };
  parentReference?: { driveId?: string; path?: string };
};

export type GraphDriveItemList = {
  value: GraphDriveItem[];
  '@odata.nextLink'?: string;
};

export type GraphSite = {
  id: string;
  name: string;
  displayName?: string;
  webUrl: string;
  description?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
};

export type GraphSiteList = {
  value: GraphSite[];
};
