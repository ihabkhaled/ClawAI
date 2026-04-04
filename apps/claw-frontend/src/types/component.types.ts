import type { LucideIcon } from "lucide-react";

import type { SidebarItem } from "@/constants";
import type { ComponentSize, ConnectorStatus } from "@/enums";

// ─── Common component props ──────────────────────────────────────────────────

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
};

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export type LoadingSpinnerProps = {
  className?: string;
  size?: ComponentSize;
  label?: string;
};

export type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export type StatusBadgeProps = {
  status: ConnectorStatus | string;
  className?: string;
};

// ─── Layout component props ──────────────────────────────────────────────────

export type SidebarNavItemProps = {
  item: SidebarItem;
};

// ─── Page-specific types ─────────────────────────────────────────────────────

export type ProvidersProps = {
  children: React.ReactNode;
};
