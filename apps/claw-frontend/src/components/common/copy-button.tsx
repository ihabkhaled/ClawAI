'use client';

import { Check, Copy } from 'lucide-react';
import type * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  COPY_BUTTON_SIZE_TO_BUTTON_SIZE,
  COPY_BUTTON_SIZE_TO_ICON_CLASS,
} from '@/constants/copy-button.constants';
import { ComponentSize } from '@/enums';
import { CopyButtonVariant } from '@/enums/copy-button-variant.enum';
import { useCopyButton } from '@/hooks/ui/use-copy-button';
import { cn } from '@/lib/utils';
import type { CopyButtonProps } from '@/types/component.types';

// Tiny "copy to clipboard" button with a 2-second "Copied!" feedback. Visual
// variants delegate to the shadcn <Button /> primitives so this control blends
// into whatever surface it's dropped on.
export function CopyButton({
  text,
  label,
  size = ComponentSize.MD,
  variant = CopyButtonVariant.Ghost,
  className,
}: CopyButtonProps): React.ReactElement {
  const { copied, onClick } = useCopyButton(text);

  return (
    <Button
      type="button"
      variant={variant}
      size={COPY_BUTTON_SIZE_TO_BUTTON_SIZE[size]}
      onClick={onClick}
      aria-label={label ?? 'Copy to clipboard'}
      className={cn('relative', className)}
    >
      {copied ? (
        <Check
          className={cn(COPY_BUTTON_SIZE_TO_ICON_CLASS[size], 'text-success')}
          aria-hidden="true"
        />
      ) : (
        <Copy className={COPY_BUTTON_SIZE_TO_ICON_CLASS[size]} aria-hidden="true" />
      )}
      <span className="sr-only">{copied ? 'Copied!' : (label ?? 'Copy')}</span>
    </Button>
  );
}
