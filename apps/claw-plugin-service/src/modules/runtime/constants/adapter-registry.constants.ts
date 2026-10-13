// Adapter keys the in-process runtime will resolve. Batch 1 ships the keys only;
// the implementations register against these keys in the batch that adds the
// invoke path. A published BUILTIN manifest must name a key listed here.
export const BUILTIN_ADAPTER_KEYS: readonly string[] = [
  'web-fetch',
  'datetime-and-math',
  'weather',
];
