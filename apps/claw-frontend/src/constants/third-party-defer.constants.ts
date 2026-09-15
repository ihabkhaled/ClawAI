// How long after mount a third-party tag may wait for an idle slot before it
// is loaded anyway. Long enough for the main thread to finish hydrating the
// page on a mid-tier phone, short enough that a busy page still measures and
// still monetises.
export const THIRD_PARTY_IDLE_TIMEOUT_MS = 2_500;
