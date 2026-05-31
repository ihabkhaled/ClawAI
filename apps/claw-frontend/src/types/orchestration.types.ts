import type { LucideIcon } from 'lucide-react';

import type { OrchestrationStageStatus } from '@/enums/orchestration-stage-status.enum';
import type { TranslateFunction } from '@/types/i18n.types';

import type { ModelSelection } from './component.types';

// One row in the OrchestrationStageTimeline. Per-page hooks (e.g.
// useConsensusPoll, useEscalationPoll, useRepairPoll …) project their
// own SSE / poll-derived progress into an array of these.
//
// `id` is the React key — must be stable across re-renders so the list
// can flicker-free swap status without losing focus.
//
// `detail` is an optional second line (e.g. "Score: 0.87" or
// "candidate 2/5") rendered under the label in `text-muted-foreground`.
//
// `actorName` is the small chip on the right (e.g. "anthropic/sonnet"
// or "Synthesizer") — the per-model badge during execution.
export type OrchestrationStage = {
  id: string;
  label: string;
  status: OrchestrationStageStatus;
  detail?: string;
  actorName?: string;
};

export type OrchestrationStageTimelineProps = {
  stages: OrchestrationStage[];
  className?: string;
  // Mobile breakpoint behaviour. When true (default), rows collapse to a
  // compact icon-only column under 480px. Set to false on pages that
  // already manage their own responsive container.
  collapseOnMobile?: boolean;
  t: TranslateFunction;
};

// Gradient hero rendered at the top of every orchestration lab page.
// Renders the icon inside a rounded brand-gradient tile, the title as
// the page H1, and the description as a single line of muted copy.
// `badge` is an optional React node (typically a <Badge />) rendered
// to the right of the title — used for plan gating / mode hints.
export type OrchestrationPageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: React.ReactNode;
  className?: string;
};

// Single-model picker rendered above every orchestration prompt input.
// Wraps the same local-Ollama dropdown the advanced module selector uses
// but ENFORCES a non-null selection — there is no AUTO entry. The
// `value` may be `null` to represent "nothing picked yet" but a real
// selection is required before submit. Validation is the host page's
// responsibility (it disables the submit button when `value === null`).
export type OrchestrationSingleModelSelectProps = {
  value: ModelSelection | null;
  onChange: (selection: ModelSelection | null) => void;
  disabled?: boolean;
  label?: string;
  // i18n key namespace override — defaults to `advancedModelSelector.*` so
  // the labels read identically to the existing module selector. Set this
  // when an orchestration page wants its own bespoke phrasing.
  placeholderLabel?: string;
  loadingLabel?: string;
  emptyLabel?: string;
  helperLabel?: string;
  t: TranslateFunction;
};

// Composition contract for the shared <OrchestrationPageShell />.
// Every orchestration lab page renders ONE of these and threads the
// per-mode pieces in through render-prop slots.
//
// Layout (desktop ≥ md):
//   ┌──────────────────────── header ───────────────────────────┐
//   │ icon  title           [badge]                              │
//   │ description                                                │
//   ├────────────────────┬───────────────────────────────────────┤
//   │  inputColumn       │  output column                        │
//   │   • model select   │  ├─ progress (when isPending+hasProg) │
//   │   • prompt area    │  ├─ skeleton  (when isPending+!prog)  │
//   │   • per-mode slot  │  ├─ result    (when result)           │
//   │                    │  ├─ alert     (when errorMessage)     │
//   │   submit button    │  └─ empty     (otherwise)             │
//   └────────────────────┴───────────────────────────────────────┘
//
// On mobile the two columns stack (inputColumn first, then output).
//
// Container is `flex h-full min-h-0 flex-col`; the body uses
// `overflow-y-auto` so long results scroll inside the page instead of
// pushing the parent layout.
export type OrchestrationPageShellProps = {
  // ─── Header ────────────────────────────────────────────────
  headerIcon: LucideIcon;
  headerTitle: string;
  headerDescription: string;
  headerBadge?: React.ReactNode;

  // ─── Single-model picker ───────────────────────────────────
  selectedModel: ModelSelection | null;
  onModelChange: (selection: ModelSelection | null) => void;

  // ─── Prompt + per-mode extra fields ────────────────────────
  prompt: string;
  onPromptChange: (next: string) => void;
  promptPlaceholder?: string;
  promptLabel?: string;
  // Extra controls rendered between the prompt textarea and the submit
  // button. Each page surfaces its own per-mode fields here (repair
  // type checkboxes, sub-task count, escalation chain builder, etc.).
  extraFieldsSlot?: React.ReactNode;

  // ─── Submit ─────────────────────────────────────────────────
  onSubmit: () => void;
  submitLabel: string;
  // When true, the submit button is force-disabled in addition to the
  // shell's own model+prompt validity gate. Host pages set this while
  // their own per-mode validation fails (e.g. zero repair types ticked).
  isSubmitDisabled?: boolean;

  // ─── Run state ─────────────────────────────────────────────
  isPending: boolean;
  // True iff at least one progress stage has arrived. Drives whether
  // the loading skeleton or the live progress panel is shown.
  hasProgress: boolean;
  stages: OrchestrationStage[];

  // ─── Output ─────────────────────────────────────────────────
  // Pure render. Shown when not pending and the per-page result is
  // ready. Slot ownership: the host page renders its own result card
  // (RepairResultCard, ConsensusSynthesisCard, etc.) and passes it in.
  resultSlot?: React.ReactNode;
  // Pure render. Shown when nothing has ever been submitted yet. Host
  // pages typically pass an <EmptyState icon=… title=… description=… />.
  emptySlot?: React.ReactNode;

  // ─── Error ─────────────────────────────────────────────────
  errorMessage?: string | null;

  // ─── i18n ──────────────────────────────────────────────────
  t: TranslateFunction;

  className?: string;
};
