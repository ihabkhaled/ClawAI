"use client";

import { MessageSquare, Plus } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  return (
    <div>
      <PageHeader
        title="Chat"
        description="Manage your AI conversation threads"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        }
      />
      <EmptyState
        icon={MessageSquare}
        title="No threads yet"
        description="Start a new conversation to interact with your configured AI models through the orchestration layer."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        }
      />
    </div>
  );
}
