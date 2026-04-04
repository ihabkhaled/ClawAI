"use client";

import { Brain, Plus } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PageHeader } from "@/components/common/page-header";
import { MemoryCard } from "@/components/memory/memory-card";
import { MemoryForm } from "@/components/memory/memory-form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEMORY_TYPE_LABELS } from "@/constants";
import { MemoryType } from "@/enums";
import { useMemoryPage } from "@/hooks/memory/use-memory-page";

const FILTER_OPTIONS = [
  { value: "ALL", label: "All Types" },
  ...Object.values(MemoryType).map((t) => ({
    value: t,
    label: MEMORY_TYPE_LABELS[t],
  })),
];

export default function MemoryPage() {
  const {
    memories,
    isLoading,
    isError,
    error,
    filterType,
    setFilterType,
    isFormOpen,
    setIsFormOpen,
    editingMemory,
    handleOpenCreate,
    handleOpenEdit,
    handleFormSubmit,
    handleToggle,
    handleDelete,
    isFormPending,
    isTogglePending,
  } = useMemoryPage();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader
          title="Memory"
          description="Manage persistent memory and context retention across conversations"
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error?.message ?? "Failed to load memory records."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Memory"
        description="Manage persistent memory and context retention across conversations"
        actions={
          <div className="flex items-center gap-3">
            <Select
              value={filterType}
              onValueChange={(value) =>
                setFilterType(value as MemoryType | "ALL")
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Memory
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <LoadingSpinner label="Loading memory records..." />
      ) : memories.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No memory entries"
          description="Memory entries will be created automatically as you interact with AI models, or you can create them manually."
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Memory
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onToggle={handleToggle}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              isTogglePending={isTogglePending}
            />
          ))}
        </div>
      )}

      <MemoryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        isPending={isFormPending}
        memory={editingMemory}
      />
    </div>
  );
}
