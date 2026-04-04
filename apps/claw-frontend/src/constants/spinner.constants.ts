import { ComponentSize } from "@/enums";

export const SPINNER_SIZE_CLASSES = {
  [ComponentSize.SM]: "h-4 w-4",
  [ComponentSize.MD]: "h-8 w-8",
  [ComponentSize.LG]: "h-12 w-12",
} as const;
