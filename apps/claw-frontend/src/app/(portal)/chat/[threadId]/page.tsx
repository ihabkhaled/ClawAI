"use client";

import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants";

export default function ThreadDetailPage() {
  const params = useParams<{ threadId: string }>();

  if (!params.threadId) {
    return <LoadingSpinner label="Loading thread..." />;
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Thread"
        description={`Thread ${params.threadId}`}
        actions={
          <Button variant="outline" asChild>
            <Link href={ROUTES.CHAT}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to threads
            </Link>
          </Button>
        }
      />

      <div className="flex flex-1 flex-col rounded-lg border">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No messages yet. Send a message to start the conversation.
          </div>
        </div>

        <div className="border-t p-4">
          <form className="flex gap-2">
            <Textarea
              placeholder="Type your message..."
              className="min-h-[44px] resize-none"
              rows={1}
            />
            <Button type="submit" size="icon" className="shrink-0">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
