/** Nominal latency stamped on every scripted response; timing is not evidenced here. */
export const LAB_INJECTED_LATENCY_MS = 10;
export const LAB_DEFAULT_WORKFLOW = 'DIRECT';
export const LAB_DEFAULT_CONFIDENCE = 0.9;
/** Below the fixture chain's 0.75 floor, so this always reclassifies to LOW_CONFIDENCE. */
export const LAB_LOW_CONFIDENCE_SAMPLE = 0.2;
export const LAB_MALFORMED_RAW = 'lab-injected: not parseable json';
