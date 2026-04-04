"use client";

import { Plus, Plug } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";

export default function ConnectorsPage() {
  return (
    <div>
      <PageHeader
        title="Connectors"
        description="Manage your AI provider connections"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Connector
          </Button>
        }
      />
      <EmptyState
        icon={Plug}
        title="No connectors configured"
        description="Connect to AI providers like OpenAI, Anthropic, Google, or your local Ollama instance to start orchestrating models."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Connector
          </Button>
        }
      />
    </div>
  );
}
