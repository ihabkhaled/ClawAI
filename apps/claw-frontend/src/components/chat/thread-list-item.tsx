import Link from "next/link";

import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";
import type { ChatThread } from "@/types";

import { RoutingBadge } from "./routing-badge";

type ThreadListItemProps = {
  thread: ChatThread;
  isActive?: boolean;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ThreadListItem({ thread, isActive }: ThreadListItemProps) {
  const messageCount = thread._count?.messages ?? 0;

  return (
    <Link
      href={ROUTES.CHAT_THREAD(thread.id)}
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-3 transition-colors hover:bg-accent",
        isActive && "border-primary bg-accent",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">
          {thread.title ?? "Untitled"}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(thread.updatedAt)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <RoutingBadge mode={thread.routingMode} />
        <span className="text-xs text-muted-foreground">
          {messageCount} {messageCount === 1 ? "message" : "messages"}
        </span>
      </div>
    </Link>
  );
}
