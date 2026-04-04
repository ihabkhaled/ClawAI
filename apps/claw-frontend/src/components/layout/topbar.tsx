"use client";

import { Separator } from "@/components/ui/separator";

import { UserMenu } from "./user-menu";

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        {/* Breadcrumb or search can go here */}
      </div>
      <div className="flex items-center gap-2">
        <Separator orientation="vertical" className="h-6" />
        <UserMenu />
      </div>
    </header>
  );
}
