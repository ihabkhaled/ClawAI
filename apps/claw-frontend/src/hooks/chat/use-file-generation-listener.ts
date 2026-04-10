import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import { fileGenerationRepository } from '@/repositories/file-generation/file-generation.repository';
import type { FileGeneration, FileGenerationEventPayload } from '@/types/file-generation.types';
import { isTerminalFileStatus, logger } from '@/utilities';

export function useFileGenerationListener(generationId: string | undefined) {
  const [generation, setGeneration] = useState<FileGeneration | null>(null);
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
      void fileGenerationRepository
        .getById(gid)
        .then((gen) => {
          errorCount = 0;
          setGeneration(gen);
          if (!isTerminalFileStatus(gen.status)) {
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

    logger.debug({ component: 'chat', action: 'file-gen-listen-start', message: 'Starting file generation listener', details: { generationId } });

    void fileGenerationRepository
      .getById(generationId)
      .then((gen) => {
        setGeneration(gen);
        if (isTerminalFileStatus(gen.status)) {
          logger.debug({ component: 'chat', action: 'file-gen-already-terminal', message: 'File generation already in terminal state', details: { generationId, status: gen.status } });
          return;
        }

        const sseUrl = `${API_BASE_URL}/file-generations/${generationId}/events`;
        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event: MessageEvent<string>) => {
          try {
            const payload = JSON.parse(event.data) as FileGenerationEventPayload;
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

            if (isTerminalFileStatus(payload.status)) {
              cleanup();
              void fileGenerationRepository.getById(generationId).then(setGeneration);
            }
          } catch {
            // ignore parse errors
          }
        };

        eventSource.onerror = () => {
          logger.warn({ component: 'chat', action: 'file-gen-sse-error', message: 'File generation SSE error, falling back to polling', details: { generationId } });
          cleanup();
          startPolling(generationId);
        };
      })
      .catch(() => {
        logger.warn({ component: 'chat', action: 'file-gen-fetch-error', message: 'Failed to fetch file generation, starting polling', details: { generationId } });
        startPolling(generationId);
      });

    return cleanup;
  }, [generationId, cleanup, startPolling]);

  return generation;
}
