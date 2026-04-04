"use client";

import { Cpu } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export default function ModelsPage() {
  return (
    <div>
      <PageHeader
        title="Models"
        description="Browse and manage available AI models across all connectors"
      />
      <EmptyState
        icon={Cpu}
        title="No models synced"
        description="Models will appear here once you configure a connector and sync its available models."
      />
    </div>
  );
}
