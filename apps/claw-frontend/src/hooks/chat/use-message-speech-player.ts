import { useCallback, useEffect, useRef, useState } from 'react';

import { MESSAGE_SPEECH_PHASE_KEYS } from '@/constants/message-speech.constants';
import { MessageSpeechJobStatus } from '@/enums/message-speech-job-status.enum';
import { MessageSpeechPlaybackPhase } from '@/enums/message-speech-playback-phase.enum';
import { useCancelMessageSpeech } from '@/hooks/chat/use-cancel-message-speech';
import { useLatestMessageSpeech } from '@/hooks/chat/use-latest-message-speech';
import { useMessageSpeechOpenFlag } from '@/hooks/chat/use-message-speech-open-flag';
import { useMessageSpeechState } from '@/hooks/chat/use-message-speech-state';
import { useSpeechSegmentBlobs } from '@/hooks/chat/use-speech-segment-blobs';
import { useTranslation } from '@/lib/i18n';
import type { UseMessageSpeechPlayerReturn } from '@/types/message-speech.types';
import {
  deriveMessageSpeechPhase,
  findSpeechSegment,
  firstSpeechSegmentIndex,
  nextSpeechSegmentIndex,
  resolveSpeechPlayerErrorKey,
} from '@/utilities/message-speech.utility';

/**
 * The progressive read-aloud player of one reply (mounted only while open).
 * It is the ONLY observer that polls the job's state; it plays the segments
 * in index order as they arrive — waiting for a late one rather than skipping
 * it, skipping only a part a finished PARTIAL job never produced — and
 * preloads the next segment. Play/pause drive the one audio element; stop
 * closes the player, which unmounts it: polling stops, blobs are revoked,
 * playback ends — and, while the job is still GENERATING, it also asks the
 * backend to stop it (parts already made stay; nothing more is charged).
 */
export function useMessageSpeechPlayer(messageId: string): UseMessageSpeechPlayerReturn {
  const { t } = useTranslation();
  const { setOpen } = useMessageSpeechOpenFlag(messageId);
  const latest = useLatestMessageSpeech(messageId);
  const cancelIfGenerating = useCancelMessageSpeech(messageId);
  const { state, isPollingExpired } = useMessageSpeechState(messageId, {
    enabled: !latest.isPending && !latest.isError,
    poll: true,
  });
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [isPaused, setPaused] = useState(false);
  const [isFinished, setFinished] = useState(false);
  const [hasAudioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const index = chosenIndex ?? firstSpeechSegmentIndex(state);
  const { urls, hasError: hasFetchError } = useSpeechSegmentBlobs(state, index);
  const currentUrl = isFinished ? null : (urls[index] ?? null);

  // The part being waited for will never come (the job ended without it): move on.
  useEffect(() => {
    if (
      state === undefined ||
      state.status === MessageSpeechJobStatus.GENERATING ||
      isFinished ||
      findSpeechSegment(state, index) !== undefined
    ) {
      return;
    }
    const next = nextSpeechSegmentIndex(state, index);
    if (next === null) {
      setFinished(true);
    } else {
      setChosenIndex(next);
    }
  }, [state, index, isFinished]);

  const onEnded = useCallback((): void => {
    const next = nextSpeechSegmentIndex(state, index);
    if (next === null) {
      setFinished(true);
      return;
    }
    setChosenIndex(next);
  }, [state, index]);

  const togglePause = useCallback((): void => {
    const audio = audioRef.current;
    if (audio === null) {
      return;
    }
    if (audio.paused) {
      void audio.play().catch(() => {
        setPaused(true);
      });
      return;
    }
    audio.pause();
  }, []);

  const onPlay = useCallback((): void => {
    setPaused(false);
  }, []);

  // A part ending fires `pause` too; that is not the user pausing.
  const onPause = useCallback((): void => {
    if (audioRef.current?.ended !== true) {
      setPaused(true);
    }
  }, []);

  const onAudioError = useCallback((): void => {
    setAudioError(true);
  }, []);

  const stop = useCallback((): void => {
    cancelIfGenerating(state);
    setOpen(false);
  }, [cancelIfGenerating, state, setOpen]);

  const hasPlaybackError = hasAudioError || hasFetchError;
  const phase = deriveMessageSpeechPhase({
    state,
    currentIndex: index,
    hasCurrentAudio: currentUrl !== null,
    isPaused,
    isFinished,
    hasPlaybackError,
    isPollingExpired,
  });
  const statusText =
    phase === MessageSpeechPlaybackPhase.PLAYING
      ? t(MESSAGE_SPEECH_PHASE_KEYS[phase], {
          current: index + 1,
          total: state?.totalSegments ?? 0,
        })
      : t(MESSAGE_SPEECH_PHASE_KEYS[phase]);

  return {
    t,
    phase,
    statusText,
    audioRef,
    currentUrl,
    isPaused,
    canTogglePause: currentUrl !== null,
    togglePause,
    stop,
    onEnded,
    onPlay,
    onPause,
    onAudioError,
    isBusy:
      phase === MessageSpeechPlaybackPhase.PREPARING ||
      phase === MessageSpeechPlaybackPhase.WAITING,
    isTruncated: state?.truncated === true,
    isPartial: state?.status === MessageSpeechJobStatus.PARTIAL,
    errorKey: resolveSpeechPlayerErrorKey({
      startError: latest.isError ? latest.error : null,
      state,
      isPollingExpired,
      hasPlaybackError,
    }),
  };
}
