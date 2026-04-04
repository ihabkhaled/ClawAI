"use client";

import {
  BookOpen,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
} from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PageHeader } from "@/components/common/page-header";
import { ContextPackForm } from "@/components/context-packs/context-pack-form";
import { ContextPackItemForm } from "@/components/context-packs/context-pack-item-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CONTEXT_PACK_ITEM_TYPE_LABELS } from "@/constants";
import type { ContextPackItemType } from "@/enums";
import { useContextPage } from "@/hooks/context-packs/use-context-page";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ContextPage() {
  const {
    contextPacks,
    isLoading,
    isError,
    error,
    isCreateFormOpen,
    setIsCreateFormOpen,
    handleCreatePack,
    isCreatePending,
    selectedPackId,
    setSelectedPackId,
    selectedPack,
    isDetailLoading,
    handleDeletePack,
    isDeletePending,
    isAddItemFormOpen,
    setIsAddItemFormOpen,
    handleAddItem,
    isAddItemPending,
    handleReorderItem,
    isUpdateItemPending,
    handleRemoveItem,
    isRemoveItemPending,
  } = useContextPage();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title="Context Packs"
          description="Define and manage context rules for AI interactions"
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error?.message ?? "Failed to load context packs."}
          </p>
        </div>
      </div>
    );
  }

  if (selectedPackId) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title={selectedPack?.name ?? "Context Pack"}
          description={selectedPack?.description ?? "Pack details and items"}
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedPackId(null)}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Packs
              </Button>
              <Button onClick={() => setIsAddItemFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePack}
                disabled={isDeletePending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeletePending ? "Deleting..." : "Delete Pack"}
              </Button>
            </div>
          }
        />

        {isDetailLoading ? (
          <LoadingSpinner label="Loading pack details..." />
        ) : !selectedPack?.items.length ? (
          <EmptyState
            icon={BookOpen}
            title="No items in this pack"
            description="Add text notes, instructions, or file references to this context pack."
            action={
              <Button onClick={() => setIsAddItemFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {selectedPack.items
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item, index) => (
                <Card key={item.id}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0 || isUpdateItemPending}
                        onClick={() =>
                          handleReorderItem(
                            item.id,
                            selectedPack.items[index - 1]?.sortOrder ?? 0,
                          )
                        }
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={
                          index === selectedPack.items.length - 1 ||
                          isUpdateItemPending
                        }
                        onClick={() =>
                          handleReorderItem(
                            item.id,
                            selectedPack.items[index + 1]?.sortOrder ?? 0,
                          )
                        }
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {CONTEXT_PACK_ITEM_TYPE_LABELS[
                            item.type as ContextPackItemType
                          ] ?? item.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          #{item.sortOrder}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">
                        {item.content ?? `File: ${item.fileId ?? "N/A"}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isRemoveItemPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        <ContextPackItemForm
          open={isAddItemFormOpen}
          onOpenChange={setIsAddItemFormOpen}
          onSubmit={handleAddItem}
          isPending={isAddItemPending}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Context Packs"
        description="Define and manage context rules for AI interactions"
        actions={
          <Button onClick={() => setIsCreateFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Pack
          </Button>
        }
      />

      {isLoading ? (
        <LoadingSpinner label="Loading context packs..." />
      ) : contextPacks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No context packs defined"
          description="Create context packs to provide system-level instructions, personas, and behavioral guidelines for your AI models."
          action={
            <Button onClick={() => setIsCreateFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Pack
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contextPacks.map((pack) => (
            <Card
              key={pack.id}
              className="cursor-pointer transition-colors hover:border-primary/50"
              onClick={() => setSelectedPackId(pack.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedPackId(pack.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{pack.name}</CardTitle>
                {pack.description ? (
                  <p className="text-sm text-muted-foreground">
                    {pack.description}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {pack.scope ? (
                    <Badge variant="outline" className="text-xs">
                      {pack.scope}
                    </Badge>
                  ) : (
                    <span />
                  )}
                  <span>Updated {formatDate(pack.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ContextPackForm
        open={isCreateFormOpen}
        onOpenChange={setIsCreateFormOpen}
        onSubmit={handleCreatePack}
        isPending={isCreatePending}
      />
    </div>
  );
}
