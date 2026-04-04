"use client";

import { Zap } from "lucide-react";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { ROUTES, SIDEBAR_NAV_ITEMS } from "@/constants";

import { SidebarNavItem } from "./sidebar-nav-item";

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 px-6">
        <Link
          href={ROUTES.CHAT}
          className="flex items-center gap-2 font-bold text-lg"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span>Claw</span>
        </Link>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {SIDEBAR_NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.href} item={item} />
        ))}
      </nav>
      <Separator />
      <div className="px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Claw v0.1.0
        </p>
      </div>
    </aside>
  );
}
