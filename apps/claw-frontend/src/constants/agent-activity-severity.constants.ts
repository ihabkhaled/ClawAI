import { AlertTriangle, CheckCircle, Info, type LucideIcon } from 'lucide-react';

import { ActivitySeverity, CapabilityInvocationStatus } from '@/enums';

/**
 * Lookup table from severity bucket -> the lucide icon component to render.
 * Living in constants (not the .tsx component) so the component file does not
 * have to define a sub-component / inline JSX helper to pick an icon.
 */
export const SEVERITY_ICON_MAP: Readonly<Record<ActivitySeverity, LucideIcon>> = {
  [ActivitySeverity.SUCCESS]: CheckCircle,
  [ActivitySeverity.PENDING]: Info,
  [ActivitySeverity.WARNING]: AlertTriangle,
  [ActivitySeverity.CRITICAL]: AlertTriangle,
  [ActivitySeverity.INFO]: Info,
};

/**
 * Maps a capability invocation status -> activity severity bucket.
 * Used by the activity log to pick the right icon + accent color.
 */
export const STATUS_TO_SEVERITY: Readonly<Record<CapabilityInvocationStatus, ActivitySeverity>> = {
  [CapabilityInvocationStatus.PENDING_APPROVAL]: ActivitySeverity.PENDING,
  [CapabilityInvocationStatus.APPROVED]: ActivitySeverity.INFO,
  [CapabilityInvocationStatus.AUTO_APPROVED]: ActivitySeverity.SUCCESS,
  [CapabilityInvocationStatus.EXECUTING]: ActivitySeverity.INFO,
  [CapabilityInvocationStatus.EXECUTED]: ActivitySeverity.SUCCESS,
  [CapabilityInvocationStatus.FAILED]: ActivitySeverity.CRITICAL,
  [CapabilityInvocationStatus.REJECTED]: ActivitySeverity.WARNING,
  [CapabilityInvocationStatus.DENIED]: ActivitySeverity.CRITICAL,
  [CapabilityInvocationStatus.EXPIRED]: ActivitySeverity.WARNING,
  [CapabilityInvocationStatus.CANCELLED]: ActivitySeverity.WARNING,
  [CapabilityInvocationStatus.ROLLED_BACK]: ActivitySeverity.WARNING,
  [CapabilityInvocationStatus.ROLLBACK_FAILED]: ActivitySeverity.CRITICAL,
};

/**
 * Per-severity style bundle. We bind to the new --accent-* tokens declared in
 * globals.css (purple / teal / amber / rose) plus the existing semantic
 * success / warning / destructive tokens so dark + light themes stay legible.
 *
 * `iconClass` colors the lucide icon.
 * `accentClass` paints the 3px left rule on the collapsible entry.
 * `bgClass` is the soft tinted background applied to the collapsed row.
 */
export const SEVERITY_STYLES: Readonly<
  Record<ActivitySeverity, { iconClass: string; accentClass: string; bgClass: string }>
> = {
  [ActivitySeverity.SUCCESS]: {
    iconClass: 'text-[hsl(var(--accent-teal))]',
    accentClass: 'bg-[hsl(var(--accent-teal))]',
    bgClass: 'bg-[hsl(var(--accent-teal)/0.06)]',
  },
  [ActivitySeverity.PENDING]: {
    iconClass: 'text-[hsl(var(--accent-amber))]',
    accentClass: 'bg-[hsl(var(--accent-amber))]',
    bgClass: 'bg-[hsl(var(--accent-amber)/0.06)]',
  },
  [ActivitySeverity.WARNING]: {
    iconClass: 'text-[hsl(var(--accent-amber))]',
    accentClass: 'bg-[hsl(var(--accent-amber))]',
    bgClass: 'bg-[hsl(var(--accent-amber)/0.06)]',
  },
  [ActivitySeverity.CRITICAL]: {
    iconClass: 'text-[hsl(var(--accent-rose))]',
    accentClass: 'bg-[hsl(var(--accent-rose))]',
    bgClass: 'bg-[hsl(var(--accent-rose)/0.06)]',
  },
  [ActivitySeverity.INFO]: {
    iconClass: 'text-[hsl(var(--accent-purple))]',
    accentClass: 'bg-[hsl(var(--accent-purple))]',
    bgClass: 'bg-[hsl(var(--accent-purple)/0.06)]',
  },
};
