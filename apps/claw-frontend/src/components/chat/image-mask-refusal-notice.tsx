'use client';

import { ImageOff } from 'lucide-react';

import { ImageMaskRefusalCode } from '@/enums/image-mask-refusal-code.enum';
import { useTranslation } from '@/lib/i18n';
import type { ImageMaskRefusalNoticeProps } from '@/types/image-mask-editor.types';

/**
 * The reply when a masked edit was refused (image-service 422): the mask did
 * not fit the image, or the model behind the edit cannot take a mask. Shown in
 * the transcript, translated, replacing the English fallback chat-service stores.
 */
export function ImageMaskRefusalNotice({ code }: ImageMaskRefusalNoticeProps): React.ReactElement {
  const { t } = useTranslation();
  const body =
    code === ImageMaskRefusalCode.MaskInvalid
      ? t('chat.maskEdit.refusal.invalid')
      : t('chat.maskEdit.refusal.notSupported');

  return (
    <section
      role="status"
      className="border-warning/40 bg-warning/5 flex items-start gap-3 rounded-lg border border-dashed p-4"
      data-testid="image-mask-refusal-notice"
    >
      <ImageOff className="text-warning mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t('chat.maskEdit.refusal.title')}</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{body}</p>
      </div>
    </section>
  );
}
