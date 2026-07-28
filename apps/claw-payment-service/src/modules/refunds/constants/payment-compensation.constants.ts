export const AUTOMATIC_COMPENSATION_CRON = '*/1 * * * *';
export const AUTOMATIC_COMPENSATION_BATCH_SIZE = 25;
export const AUTOMATIC_COMPENSATION_JOB_NAME = 'automatic-payment-compensation';
export const AUTOMATIC_COMPENSATION_LOCK_KEY = 'lock:automatic-payment-compensation';
export const AUTOMATIC_COMPENSATION_LOCK_TTL_SECONDS = 55;
export const AUTOMATIC_REFUND_ACTOR = 'system:payment-compensation';
export const AUTOMATIC_REFUND_RETRY_BASE_MS = 60_000;
