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
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailMessagePart[];
  mimeType?: string;
  filename?: string;
  partId?: string;
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
