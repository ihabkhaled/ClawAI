'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { AdminFeedbackImageViewerProps } from '@/types/feedback-props.types';

export function AdminFeedbackImageViewer({
  src,
  alt,
  open,
  onOpenChange,
}: AdminFeedbackImageViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">{alt || 'Image preview'}</DialogTitle>
      <DialogContent className="max-w-none border-0 bg-transparent p-0 shadow-none">
        <div className="relative flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-10 right-0 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
            aria-label="Close image preview"
          >
            <X className="h-6 w-6" />
          </Button>
          <img src={src} alt={alt} className="max-h-[80vh] max-w-full rounded-md object-contain" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
