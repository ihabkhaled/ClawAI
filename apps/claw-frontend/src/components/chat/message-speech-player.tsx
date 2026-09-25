'use client';

import { MessageSpeechPlayback } from '@/components/chat/message-speech-playback';
import { useMessageSpeechOpenFlag } from '@/hooks/chat/use-message-speech-open-flag';
import type { MessageSpeechPlayerProps } from '@/types/message-speech.types';

/**
 * Where the read-aloud player goes under an assistant reply. The playback
 * itself mounts only while the player is open, so closing it (the button's
 * stop, or the player's own) unmounts it: polling stops, audio blobs are
 * revoked and playback ends — nothing keeps running for a closed player.
 */
export function MessageSpeechPlayer({
  messageId,
}: MessageSpeechPlayerProps): React.ReactElement | null {
  const { isOpen } = useMessageSpeechOpenFlag(messageId);
  return isOpen ? <MessageSpeechPlayback messageId={messageId} /> : null;
}
