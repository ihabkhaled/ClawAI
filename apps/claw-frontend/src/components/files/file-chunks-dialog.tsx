import { useQuery } from '@tanstack/react-query';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { FileChunksDialogProps } from '@/types';

export function FileChunksDialog({ fileId, onClose }: FileChunksDialogProps) {
  const query = useQuery({
    queryKey: queryKeys.files.chunks(fileId ?? ''),
    queryFn: () => filesRepository.getFile(fileId ?? ''),
    enabled: !!fileId,
  });

  const file = query.data;
  const chunks = file?.chunks ?? [];

  const loadingSkeleton = (
    <div className="space-y-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );

  const emptyState = (
    <p className="py-8 text-center text-sm text-muted-foreground">
      No chunks available for this file.
    </p>
  );

  const chunksList = (
    <div className="space-y-3">
      {chunks.map((chunk) => (
        <div key={chunk.id} className="rounded-lg border p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Chunk {chunk.chunkIndex + 1}
          </p>
          <p className="whitespace-pre-wrap text-sm">{chunk.content}</p>
        </div>
      ))}
    </div>
  );

  let resolvedContent = chunksList;
  if (query.isLoading) {
    resolvedContent = loadingSkeleton;
  } else if (chunks.length === 0) {
    resolvedContent = emptyState;
  }

  return (
    <Dialog open={!!fileId} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {file?.filename ?? 'File'} - Chunks ({chunks.length})
          </DialogTitle>
        </DialogHeader>
        {resolvedContent}
      </DialogContent>
    </Dialog>
  );
}
