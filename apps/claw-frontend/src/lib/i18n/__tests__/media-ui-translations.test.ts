import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { COMPOSER_ATTACHMENT_STATE_LABEL_KEYS } from '@/constants/composer-attachment.constants';
import {
  FILE_DELIVERY_REASON_FALLBACK_KEY,
  FILE_DELIVERY_REASON_LABEL_KEYS,
} from '@/constants/file-delivery-reason.constants';
import {
  IMAGE_STATUS_LABEL_KEYS,
  IMAGE_STATUS_PREPARING_KEY,
} from '@/constants/image-generation-status.constants';
import {
  MEDIA_RECORDING_AUDIO_BLOCKED_KEY,
  MEDIA_RECORDING_VIDEO_BLOCKED_KEY,
} from '@/constants/media-recording-copy.constants';
import { MODEL_CAPABILITY_BADGE_LABEL_KEYS } from '@/constants/model-capability-badge.constants';
import { FileDeliveryMode, ImageGenerationStatus } from '@/enums';
import { Locale } from '@/enums/locale.enum';
import { getTranslation } from '@/lib/i18n/translations';
import type { FileDeliveryEntry } from '@/types';
import { buildFileDeliveryTooltip } from '@/utilities/file-delivery.utility';
import { getImageStatusLabelKey } from '@/utilities/image-generation.utility';

// The backend's own list of reason keys — read from chat-service source so a
// reason added there without copy here fails THIS test, not a user's tooltip.
const CHAT_SERVICE_REASON_CONSTANTS = resolve(
  __dirname,
  '../../../../../claw-chat-service/src/modules/chat-messages/constants/attachment-delivery.constants.ts',
);

function backendReasonKeys(): string[] {
  const source = readFileSync(CHAT_SERVICE_REASON_CONSTANTS, 'utf8');
  return [...new Set(source.match(/file_delivery\.reason\.[a-z_]+/g) ?? [])];
}

const ALL_LOCALES = Object.values(Locale);

function expectTranslatedEverywhere(key: string): void {
  for (const locale of ALL_LOCALES) {
    const value = getTranslation(locale, key);
    expect(value, `${key} in ${locale}`).not.toBe(key);
    expect(value.trim().length, `${key} in ${locale}`).toBeGreaterThan(0);
  }
}

describe('file_delivery.reason.* localization', () => {
  it('finds the backend reason keys to check', () => {
    expect(backendReasonKeys().length).toBeGreaterThanOrEqual(15);
  });

  it('maps every reason key chat-service emits', () => {
    const unmapped = backendReasonKeys().filter((key) => !FILE_DELIVERY_REASON_LABEL_KEYS.has(key));
    expect(unmapped).toEqual([]);
  });

  it('resolves every mapped reason, and the fallback, in all 13 locales', () => {
    expect(ALL_LOCALES).toHaveLength(13);
    for (const labelKey of FILE_DELIVERY_REASON_LABEL_KEYS.values()) {
      expectTranslatedEverywhere(labelKey);
    }
    expectTranslatedEverywhere(FILE_DELIVERY_REASON_FALLBACK_KEY);
  });

  it('never shows a raw reason key in the delivery tooltip — known or unknown', () => {
    const t = (key: string, params?: Record<string, string | number>): string =>
      getTranslation(Locale.DE, key, params);
    const base: FileDeliveryEntry = {
      fileId: 'f',
      filename: 'photo.png',
      mimeType: 'image/png',
      provider: 'ANTHROPIC',
      model: 'claude',
      mode: FileDeliveryMode.DERIVED_IMAGE_TEXT,
    };
    const tooltip = buildFileDeliveryTooltip(
      [
        { ...base, reason: 'file_delivery.reason.helper_vision_plan' },
        { ...base, reason: 'file_delivery.reason.some_future_reason' },
      ],
      t,
    );

    expect(tooltip).not.toContain('file_delivery.reason');
    expect(tooltip).not.toContain('mediaUi.');
    expect(tooltip).toContain(getTranslation(Locale.DE, 'mediaUi.deliveryReason.helperVisionPlan'));
    expect(tooltip).toContain(getTranslation(Locale.DE, FILE_DELIVERY_REASON_FALLBACK_KEY));
  });
});

describe('image generation status labels', () => {
  it('has a key for every status plus the no-row-yet state', () => {
    for (const status of Object.values(ImageGenerationStatus)) {
      expect(getImageStatusLabelKey(status)).toBe(IMAGE_STATUS_LABEL_KEYS[status]);
    }
    expect(getImageStatusLabelKey(undefined)).toBe(IMAGE_STATUS_PREPARING_KEY);
  });

  it('is translated in all 13 locales, not English in non-English ones', () => {
    for (const key of [...Object.values(IMAGE_STATUS_LABEL_KEYS), IMAGE_STATUS_PREPARING_KEY]) {
      expectTranslatedEverywhere(key);
      expect(getTranslation(Locale.JA, key)).not.toBe(getTranslation(Locale.EN, key));
    }
  });
});

describe('recorder reasons, capability badges and chip states', () => {
  it('are translated in all 13 locales', () => {
    const keys = [
      MEDIA_RECORDING_AUDIO_BLOCKED_KEY,
      MEDIA_RECORDING_VIDEO_BLOCKED_KEY,
      ...Object.values(MODEL_CAPABILITY_BADGE_LABEL_KEYS),
      ...Object.values(COMPOSER_ATTACHMENT_STATE_LABEL_KEYS),
      'mediaUi.video.thumbnailAlt',
      'mediaUi.video.duration',
    ];
    for (const key of keys) {
      expectTranslatedEverywhere(key);
    }
  });
});
