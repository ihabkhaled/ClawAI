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
  /** Viewport height, since clearance is measured up from the bottom edge. */
  viewportHeight: number;
  /** Air left between the tallest obstacle and the first toast. */
  gapPx: number;
}
