"use client";

import { FolderOpen, Upload } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";

export default function FilesPage() {
  return (
    <div>
      <PageHeader
        title="Files"
        description="Upload and manage files for AI context and retrieval"
        actions={
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        }
      />
      <EmptyState
        icon={FolderOpen}
        title="No files uploaded"
        description="Upload documents, code, or other files to use as context in your AI conversations and for retrieval-augmented generation."
        action={
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        }
      />
    </div>
  );
}
