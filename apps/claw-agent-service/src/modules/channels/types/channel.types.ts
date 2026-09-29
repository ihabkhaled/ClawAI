import type { ChannelMessageKind } from '../enums/channel-message-kind.enum';

/** One inbound event as it sits in an owner's inbox. */
export type ChannelMessage = {
  id: string;
  kind: ChannelMessageKind;
  source: string;
  title: string;
  body: string;
  url: string | null;
  receivedAt: string;
};

/** What the owner needs to point an external system at their inbox. */
export type ChannelWebhookInfo = {
  url: string;
  secret: string;
  signatureHeader: string;
  timestampHeader: string;
  signatureFormat: string;
};

export type ChannelInboxPage = {
  messages: ChannelMessage[];
};

export type ChannelInboundHeaders = {
  signature: string | undefined;
  timestamp: string | undefined;
};

export type ChannelIngestResult = {
  accepted: true;
  id: string;
};

/** A stored entry: the exact serialized form (needed to remove it) and its decoded message. */
export type ChannelInboxEntry = {
  raw: string;
  message: ChannelMessage;
};
