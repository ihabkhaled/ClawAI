import { FileText, Trash2, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  INGESTION_STATUS_LABELS,
  INGESTION_STATUS_COLORS,
} from "@/constants";
import { cn } from "@/lib/utils";
import type { FileListItemProps } from "@/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FileListItem({
  file,
  onDelete,
  onViewChunks,
  isDeletePending,
}: FileListItemProps) {
  const statusLabel =
    INGESTION_STATUS_LABELS[file.ingestionStatus] ?? file.ingestionStatus;
  const statusColor =
    INGESTION_STATUS_COLORS[file.ingestionStatus] ??
    "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{file.filename}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{file.mimeType}</span>
          <span>{formatFileSize(file.sizeBytes)}</span>
          <span>{formatDate(file.createdAt)}</span>
        </div>
      </div>
      <Badge variant="outline" className={cn("shrink-0 text-xs", statusColor)}>
        {statusLabel}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onViewChunks(file.id)}
      >
        <ChevronDown className="h-4 w-4" />
        <span className="sr-only">View chunks</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
        onClick={() => onDelete(file.id)}
        disabled={isDeletePending}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Delete file</span>
      </Button>
    </div>
  );
}
