// Output of useScrollDirection. `null` is reserved by the hook for the
// initial mount state (before the first scroll event fires) so the enum only
// covers the two real directions.
export enum ScrollDirection {
  Up = 'up',
  Down = 'down',
}
