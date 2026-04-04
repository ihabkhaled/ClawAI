"use client";

import { BookOpen } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export default function ContextPage() {
  return (
    <div>
      <PageHeader
        title="Context"
        description="Define and manage context rules for AI interactions"
      />
      <EmptyState
        icon={BookOpen}
        title="No context rules defined"
        description="Create context rules to provide system-level instructions, personas, and behavioral guidelines for your AI models."
      />
    </div>
  );
}
