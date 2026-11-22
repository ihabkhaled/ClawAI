import {
  MODEL_KIND_LABEL_KEYS,
  MODEL_KIND_NOT_OFFERED_BADGE_CLASS,
  MODEL_KIND_OFFERED_BADGE_CLASS,
} from '@/constants/model-visibility.constants';
import { ConnectorModelKind } from '@/enums/connector-model-kind.enum';
import type { ConnectorModelRow } from '@/types/model-exposure.types';
import type { ModelKindView } from '@/types/model-visibility.types';

import { isAudioOutputModel } from './image-output-model.utility';

/**
 * Whether the chat picker can show a model of this kind at all: CHAT, or an
 * AUDIO model that generates speech or music. Mirrors connector-service
 * `isPickerKind`; exposure does not change it.
 */
export function isChatPickerKind(kind: ConnectorModelKind, modelKey: string): boolean {
  if (kind === ConnectorModelKind.CHAT) {
    return true;
  }
  return kind === ConnectorModelKind.AUDIO && isAudioOutputModel(modelKey);
}

/** The kind badge for one admin row; an unknown kind reads as not offered. */
export function resolveModelKindView(
  row: Pick<ConnectorModelRow, 'kind' | 'kindReason' | 'modelKey'>,
): ModelKindView {
  const offeredInChat = isChatPickerKind(row.kind, row.modelKey);
  const known = Object.values(ConnectorModelKind).find((value) => value === row.kind);
  return {
    labelKey: known === undefined ? row.kind : MODEL_KIND_LABEL_KEYS[known],
    badgeClass: offeredInChat ? MODEL_KIND_OFFERED_BADGE_CLASS : MODEL_KIND_NOT_OFFERED_BADGE_CLASS,
    offeredInChat,
    reason: offeredInChat ? null : (row.kindReason ?? null),
  };
}
