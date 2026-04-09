import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import { imageGenerationRepository } from '@/repositories/image-generation/image-generation.repository';
import type { ImageGeneration, ImageGenerationEventPayload } from '@/types/image-generation.types';
import { isTerminalImageStatus } from '@/utilities';

export function useImageGenerationListener(generationId: string | undefined) {
  const [generation, setGeneration] = useState<ImageGeneration | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const startPolling = useCallback((gid: string): void => {
    let errorCount = 0;
    const poll = (): void => {
      void imageGenerationRepository
        .getById(gid)
        .then((gen) => {
          errorCount = 0;
          setGeneration(gen);
          if (!isTerminalImageStatus(gen.status)) {
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
  }, []);

  useEffect(() => {
    if (!generationId) {
      return;
    }

    void imageGenerationRepository
      .getById(generationId)
      .then((gen) => {
        setGeneration(gen);
        if (isTerminalImageStatus(gen.status)) {
          return;
        }

        const sseUrl = `${API_BASE_URL}/images/${generationId}/events`;
        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event: MessageEvent<string>) => {
          try {
            const payload = JSON.parse(event.data) as ImageGenerationEventPayload;
            setGeneration((prev) => {
              if (!prev) {
                return prev;
              }
              return {
                ...prev,
                status: payload.status,
                provider: payload.provider ?? prev.provider,
                model: payload.model ?? prev.model,
                assets: payload.assets ?? prev.assets,
                errorCode: payload.errorCode ?? prev.errorCode,
                errorMessage: payload.errorMessage ?? prev.errorMessage,
                updatedAt: new Date().toISOString(),
              };
            });

            if (isTerminalImageStatus(payload.status)) {
              cleanup();
              void imageGenerationRepository.getById(generationId).then(setGeneration);
            }
          } catch {
            // ignore parse errors
          }
        };

        eventSource.onerror = () => {
          cleanup();
          startPolling(generationId);
        };
      })
      .catch(() => {
        startPolling(generationId);
      });

    return cleanup;
  }, [generationId, cleanup, startPolling]);

  return generation;
}
