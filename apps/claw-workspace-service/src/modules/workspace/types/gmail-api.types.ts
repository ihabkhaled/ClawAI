export type GmailMessageRef = {
  id: string;
  threadId: string;
};

export type GmailMessageListResponse = {
  messages?: GmailMessageRef[];
  nextPageToken?: string;
};

export type GmailHeader = {
  name: string;
  value: string;
};

export type GmailMessagePart = {
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailMessagePart[];
  mimeType?: string;
};

export type GmailMessage = {
  id: string;
  threadId: string;
  historyId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
};

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};
