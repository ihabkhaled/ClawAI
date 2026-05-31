"use client";

import * as React from "react";

import { TOAST_DEFAULT_DURATION_MS } from "@/constants/toast.constants";
import { ToastVariant } from "@/enums/toast-variant.enum";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 1_000_000;

// Action payload — title + optional onClick callback. Callers use this for
// Undo / Retry / View affordances. We keep it discriminated from the regular
// label so a missing onClick is a typecheck error rather than a no-op surprise
// at runtime.
interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant: ToastVariant;
  durationMs: number;
  action?: ToastAction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToastData;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToastData>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: string;
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: string;
    };

interface State {
  toasts: ToastData[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string): void => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((t) => {
          addToRemoveQueue(t.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t,
        ),
      };
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action): void {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

interface ToastInput {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  /**
   * Auto-dismiss duration override (ms). When omitted, falls back to the
   * per-variant default from TOAST_DEFAULT_DURATION_MS. Pass `0` (or any
   * non-positive number) to disable auto-dismiss entirely — useful for
   * destructive confirmations that should require explicit user action.
   */
  durationMs?: number;
  /**
   * Optional Undo/Retry/View action. The toast renders a labeled button that
   * invokes `onClick` and then dismisses itself. The handler is wrapped so a
   * thrown error in user code can't leave the toast stuck open.
   */
  action?: ToastAction;
}

function toast(input: ToastInput): {
  id: string;
  dismiss: () => void;
  update: (props: Partial<ToastData>) => void;
} {
  const id = genId();
  const variant = input.variant ?? ToastVariant.Default;
  const durationMs = input.durationMs ?? TOAST_DEFAULT_DURATION_MS[variant];

  const update = (props: Partial<ToastData>): void => {
    dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } });
  };

  const dismiss = (): void => {
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  };

  dispatch({
    type: "ADD_TOAST",
    toast: {
      id,
      title: input.title,
      description: input.description,
      variant,
      durationMs,
      action: input.action,
      open: true,
      onOpenChange: (open: boolean): void => {
        if (!open) {
          dismiss();
        }
      },
    },
  });

  return { id, dismiss, update };
}

function useToast(): State & {
  toast: typeof toast;
  dismiss: (toastId?: string) => void;
} {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string): void => {
      dispatch({ type: "DISMISS_TOAST", toastId });
    },
  };
}

export { useToast, toast };
export type { ToastAction, ToastData, ToastInput };
