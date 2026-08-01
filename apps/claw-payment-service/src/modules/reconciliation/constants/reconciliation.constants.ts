import { AppConfig } from '../../../app/config/app.config';

export const RECONCILIATION_BATCH_SIZE = 50;
export const RECONCILIATION_CRON = (): string => AppConfig.get().BILLING_RECONCILIATION_CRON;
export const RECONCILIATION_JOB_NAME = 'payment.billing.reconciliation';
export const RECONCILIATION_LOCK_KEY = 'locks:payment:billing-reconciliation';
// One bounded run has a documented four-minute operational budget. The extra
// minute keeps healthy replicas mutually exclusive and permits crash recovery.
export const RECONCILIATION_LOCK_TTL_SECONDS = 300;
export const RECONCILIATION_FAILURE_CODE = 'RECONCILIATION_RUN_FAILED';
export const PLAN_RETIREMENT_FAILURE_CODE = 'PLAN_RETIREMENT_SCHEDULE_FAILED';
