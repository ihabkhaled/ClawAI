import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FileUploadZoneProps } from "@/types";

export function FileUploadZone({
  onFileSelected,
  isUploading,
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isUploading) {
        setIsDragOver(true);
      }
    },
    [isUploading],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (isUploading) return;

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        onFileSelected(droppedFile);
      }
    },
    [isUploading, onFileSelected],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        onFileSelected(selectedFile);
      }
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onFileSelected],
  );

  const handleClick = () => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
      className={cn(
        "flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50",
        isUploading && "cursor-not-allowed opacity-50",
      )}
    >
      <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">
        {isUploading ? "Uploading..." : "Drop a file here or click to browse"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Documents, code, and other text files
      </p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleInputChange}
        disabled={isUploading}
      />
    </div>
  );
}
