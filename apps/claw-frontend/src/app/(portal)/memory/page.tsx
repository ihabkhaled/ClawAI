"use client";

import { Brain } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export default function MemoryPage() {
  return (
    <div>
      <PageHeader
        title="Memory"
        description="Manage persistent memory and context retention across conversations"
      />
      <EmptyState
        icon={Brain}
        title="No memory entries"
        description="Memory entries will be created automatically as you interact with AI models, enabling context persistence across conversations."
      />
    </div>
  );
}
