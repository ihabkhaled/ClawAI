import type { SlackMessageMetadata } from '../types/slack.types';

function resolveChannelName(metadata: Record<string, unknown>): string {
  if (typeof metadata['channelName'] === 'string') {
    return metadata['channelName'];
  }
  if (typeof metadata['channel'] === 'string') {
    return metadata['channel'];
  }
  return '';
}

function resolveSenderName(metadata: Record<string, unknown>): string {
  if (typeof metadata['senderName'] === 'string') {
    return metadata['senderName'];
  }
  if (typeof metadata['username'] === 'string') {
    return metadata['username'];
  }
  return '';
}

function resolveThreadTs(metadata: Record<string, unknown>): string | null {
  if (typeof metadata['threadTs'] === 'string') {
    return metadata['threadTs'];
  }
  if (typeof metadata['thread_ts'] === 'string') {
    return metadata['thread_ts'];
  }
  return null;
}

export function extractSlackMetadata(metadata: Record<string, unknown>): SlackMessageMetadata {
  const reactions = Array.isArray(metadata['reactions']) ? (metadata['reactions'] as string[]) : [];

  return {
    channelName: resolveChannelName(metadata),
    senderName: resolveSenderName(metadata),
    threadTs: resolveThreadTs(metadata),
    isThreadReply: metadata['isThreadReply'] === true || metadata['is_thread_reply'] === true,
    reactions,
    hasAttachments:
      metadata['hasAttachments'] === true ||
      (Array.isArray(metadata['attachments']) && (metadata['attachments'] as unknown[]).length > 0),
  };
}
