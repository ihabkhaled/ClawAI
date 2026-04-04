import { useQuery } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { filesRepository } from "@/repositories/files/files.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

type FileChunksDialogProps = {
  fileId: string | null;
  onClose: () => void;
};

export function FileChunksDialog({ fileId, onClose }: FileChunksDialogProps) {
  const query = useQuery({
    queryKey: queryKeys.files.chunks(fileId ?? ""),
    queryFn: () => filesRepository.getFile(fileId ?? ""),
    enabled: !!fileId,
  });

  const file = query.data;
  const chunks = file?.chunks ?? [];

  return (
    <Dialog open={!!fileId} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {file?.filename ?? "File"} - Chunks ({chunks.length})
          </DialogTitle>
        </DialogHeader>
        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : chunks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No chunks available for this file.
          </p>
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
