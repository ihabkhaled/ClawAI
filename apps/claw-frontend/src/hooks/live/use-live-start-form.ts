import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { LiveCapability, LiveMode } from '@/enums/live.enum';
import { useTranslation } from '@/lib/i18n';
import { liveRepository } from '@/repositories/live/live.repository';
import type { LiveCreateSessionInput, UseLiveStartFormResult } from '@/types/live.types';
import { showToast } from '@/utilities';
import { liveResolveErrorKey, parseLiveMode } from '@/utilities/live-request.utility';

/** The /live form: link, caption language, mode, rights attestation, and the resolve step. */
export function useLiveStartForm(): UseLiveStartFormResult {
  const { t, locale } = useTranslation();
  const [url, setUrlValue] = useState('');
  const [language, setLanguage] = useState<string>(locale);
  const [mode, setMode] = useState<LiveMode>(LiveMode.SMART_AUTO);
  const [attestRights, setAttestRights] = useState(false);
  const { mutate, reset, data, isPending, error } = useMutation({
    mutationFn: (value: string) => liveRepository.resolveSource({ url: value }),
    onError: (failure: Error) => showToast.apiError(failure, t(liveResolveErrorKey(failure))),
  });
  const resolution = data ?? null;
  const isPlayerOnly = resolution?.capability === LiveCapability.PLAYER_ONLY;
  const canStart = resolution !== null && (isPlayerOnly || attestRights);

  const setModeValue = useCallback((value: string): void => {
    const next = parseLiveMode(value);
    if (next !== null) {
      setMode(next);
    }
  }, []);
  const setUrl = useCallback(
    (value: string): void => {
      setUrlValue(value);
      setAttestRights(false);
      reset();
    },
    [reset],
  );
  const resolve = useCallback((): void => {
    const trimmed = url.trim();
    if (trimmed !== '') {
      mutate(trimmed);
    }
  }, [mutate, url]);
  const buildSessionInput = useCallback(
    (): LiveCreateSessionInput | null =>
      canStart
        ? { url: url.trim(), language, mode, attestRights: !isPlayerOnly && attestRights }
        : null,
    [attestRights, canStart, isPlayerOnly, language, mode, url],
  );

  return {
    url,
    language,
    mode,
    attestRights,
    resolution,
    isResolving: isPending,
    resolveError: error === null ? null : t(liveResolveErrorKey(error)),
    canStart,
    setUrl,
    setLanguage,
    setMode: setModeValue,
    setAttestRights,
    resolve,
    buildSessionInput,
  };
}
