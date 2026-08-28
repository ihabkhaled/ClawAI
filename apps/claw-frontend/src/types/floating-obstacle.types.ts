import type { FloatingClearanceEdge } from '@/enums/floating-clearance-edge.enum';

/** A measured rectangle, in viewport CSS pixels. */
export interface FloatingObstacleRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface FloatingClearanceInput {
  /** Every floating element currently on screen that opted into the registry. */
  obstacles: readonly FloatingObstacleRect[];
  /** Horizontal span of the toast column, so a left-hand widget is ignored. */
  columnLeft: number;
  columnRight: number;
  /** Viewport height — the frame both edges are measured against. */
  viewportHeight: number;
  /** Air left between the nearest obstacle and the first toast. */
  gapPx: number;
  /** Which edge the column is anchored to, and therefore measured from. */
  edge: FloatingClearanceEdge;
}
