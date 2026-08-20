import { useQuery } from '@tanstack/react-query';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { FileChunksDialogProps } from '@/types';

export function FileChunksDialog({ fileId, onClose }: FileChunksDialogProps) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: queryKeys.files.chunks(fileId ?? ''),
    queryFn: () => filesRepository.getFile(fileId ?? ''),
    enabled: !!fileId,
  });

  const file = query.data;
  const chunks = file?.chunks ?? [];

  return (
    <Dialog open={!!fileId} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-hidden sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="break-words">
            {t('files.chunksTitle', {
              filename: file?.filename ?? t('files.fileFallback'),
              count: chunks.length,
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pe-1">
          {query.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : chunks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('files.noChunks')}</p>
          ) : (
            <div className="space-y-3">
              {chunks.map((chunk) => (
                <div key={chunk.id} className="rounded-lg border p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {t('files.chunkIndex', { index: chunk.chunkIndex + 1 })}
                  </p>
                  <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-sm">{chunk.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
