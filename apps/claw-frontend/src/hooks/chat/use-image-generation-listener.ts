import { useCallback, useEffect, useRef, useState } from 'react';

import {
  API_BASE_URL,
  IMAGE_GENERATION_MAX_FOLLOW_HOPS,
  IMAGE_GENERATION_MAX_POLLS,
} from '@/constants';
import { ImageGenerationStatus } from '@/enums';
import { imageGenerationRepository } from '@/repositories/image-generation/image-generation.repository';
import type { SseConnection } from '@/types/chat.types';
import type {
  ImageGeneration,
  ImageGenerationEventPayload,
  ImageGenerationFollowState,
} from '@/types/image-generation.types';
import {
  getSupersedingGenerationId,
  isTerminalImageStatus,
  logger,
  toLatestImageGeneration,
} from '@/utilities';
import { connectSse } from '@/utilities/sse.utility';

/**
 * Follows one image card's job to whatever row it ends on.
 *
 * An AUTO fallback or a retry-alternate continues a job on a NEW row and
 * links the old one to it (`supersededById`). The listener follows that link —
 * from the SSE event live, and from `latest` on the first read after a refresh
 * — at most `IMAGE_GENERATION_MAX_FOLLOW_HOPS` times, so a FAILED row is only
 * the end of the job when nothing superseded it.
 *
 * `restartToken` re-reads the tracked row, for a same-row retry.
 */
export function useImageGenerationListener(
  generationId: string | undefined,
  restartToken = 0,
): ImageGeneration | null {
  const [generation, setGeneration] = useState<ImageGeneration | null>(null);
  const [follow, setFollow] = useState<ImageGenerationFollowState>({
    rootId: generationId,
    trackedId: generationId,
  });
  const eventSourceRef = useRef<SseConnection | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hopsRef = useRef(0);
  // A new card (or a retry-alternate) restarts the follow from its own row.
  const trackedId = follow.rootId === generationId ? follow.trackedId : generationId;

  const cleanup = useCallback((): void => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  /** Switches to the successor row; false once the hop budget is spent. */
  const followTo = useCallback(
    (nextId: string): boolean => {
      if (hopsRef.current >= IMAGE_GENERATION_MAX_FOLLOW_HOPS) {
        logger.warn({
          component: 'chat',
          action: 'image-gen-follow-limit',
          message: 'Image generation chain longer than the follow limit',
          details: { generationId: nextId },
        });
        return false;
      }
      hopsRef.current += 1;
      setFollow({ rootId: generationId, trackedId: nextId });
      return true;
    },
    [generationId],
  );

  /** Applies a fresh read; true when it handed off to a successor row. */
  const applyRead = useCallback(
    (gen: ImageGeneration): boolean => {
      const successorId = getSupersedingGenerationId(gen);
      if (successorId !== undefined && followTo(successorId)) {
        setGeneration(toLatestImageGeneration(gen));
        return true;
      }
      setGeneration(gen);
      return false;
    },
    [followTo],
  );

  const startPolling = useCallback(
    (gid: string): void => {
      let errorCount = 0;
      let polls = 0;
      const poll = (): void => {
        polls += 1;
        void imageGenerationRepository
          .getById(gid)
          .then((gen) => {
            errorCount = 0;
            const handedOff = applyRead(gen);
            if (
              !handedOff &&
              !isTerminalImageStatus(gen.status) &&
              polls < IMAGE_GENERATION_MAX_POLLS
            ) {
              pollTimerRef.current = setTimeout(poll, 2000);
            }
          })
          .catch(() => {
            errorCount += 1;
            if (errorCount >= 5) {
              return;
            }
            pollTimerRef.current = setTimeout(poll, 3000);
          });
      };
      poll();
    },
    [applyRead],
  );

  useEffect(() => {
    hopsRef.current = 0;
  }, [generationId]);

  useEffect(() => {
    if (!trackedId) {
      return;
    }
    let disposed = false;

    logger.debug({
      component: 'chat',
      action: 'image-gen-listen-start',
      message: 'Starting image generation listener',
      details: { generationId: trackedId, restartToken },
    });

    const onMessage = (data: string): void => {
      let payload: ImageGenerationEventPayload;
      try {
        payload = JSON.parse(data) as ImageGenerationEventPayload;
      } catch {
        return;
      }
      // The job moved to another row: follow it instead of stopping on FAILED.
      if (payload.supersededById !== undefined && followTo(payload.supersededById)) {
        cleanup();
        return;
      }
      setGeneration((prev) =>
        !prev
          ? prev
          : {
              ...prev,
              status: payload.status,
              provider: payload.provider ?? prev.provider,
              model: payload.model ?? prev.model,
              assets: payload.assets ?? prev.assets,
              errorCode: payload.errorCode ?? prev.errorCode,
              errorMessage: payload.errorMessage ?? prev.errorMessage,
              runtimeProgress:
                payload.status === ImageGenerationStatus.GENERATING
                  ? (payload.runtimeProgress ?? prev.runtimeProgress ?? null)
                  : null,
              updatedAt: new Date().toISOString(),
            },
      );
      if (isTerminalImageStatus(payload.status)) {
        cleanup();
        void imageGenerationRepository.getById(trackedId).then((gen) => {
          if (!disposed) {
            applyRead(gen);
          }
        });
      }
    };

    const openStream = (): void => {
      // Authenticated stream: the events route requires the owner's session
      // (it was @Public(), so anyone holding an id could watch the job). A
      // native EventSource cannot send the Bearer header; connectSse does.
      const sseUrl = `${API_BASE_URL}/images/${trackedId}/events`;
      const onError = (): void => {
        logger.warn({
          component: 'chat',
          action: 'image-gen-sse-error',
          message: 'Image generation SSE error, falling back to polling',
          details: { generationId: trackedId },
        });
        cleanup();
        startPolling(trackedId);
      };
      eventSourceRef.current = connectSse(
        sseUrl,
        {
          onMessage,
          onError,
          shouldReconnectAfterClose: () => !disposed && eventSourceRef.current !== null,
        },
        { reconnect: false },
      );
    };

    void imageGenerationRepository
      .getById(trackedId)
      .then((gen) => {
        if (disposed || applyRead(gen)) {
          return;
        }
        if (isTerminalImageStatus(gen.status)) {
          logger.debug({
            component: 'chat',
            action: 'image-gen-already-terminal',
            message: 'Image generation already in terminal state',
            details: { generationId: trackedId, status: gen.status },
          });
          return;
        }
        openStream();
      })
      .catch(() => {
        logger.warn({
          component: 'chat',
          action: 'image-gen-fetch-error',
          message: 'Failed to fetch image generation, starting polling',
          details: { generationId: trackedId },
        });
        if (!disposed) {
          startPolling(trackedId);
        }
      });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [trackedId, restartToken, cleanup, startPolling, applyRead, followTo]);

  return generation;
}
