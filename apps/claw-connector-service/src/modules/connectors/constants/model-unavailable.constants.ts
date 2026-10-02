// A provider that still LISTS a model but answers "model_not_found" /
// "has been deprecated" when it is called (ADR-151). chat-service reports each
// such answer; after this many reports inside the window the row is retired
// (lifecycle SUNSET, exposure UNEXPOSED) and stays retired across syncs.
export const MODEL_UNAVAILABLE_RETIRE_THRESHOLD = 3;

// Reports older than this no longer count: "a few times in a row", not "three
// times in a year", so a transient provider-side hiccup never retires a model.
export const MODEL_UNAVAILABLE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
