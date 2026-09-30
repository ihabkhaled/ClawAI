/** One parsed five-field cron expression: the values each field allows. */
export interface CronFields {
  readonly minutes: ReadonlySet<number>;
  readonly hours: ReadonlySet<number>;
  readonly daysOfMonth: ReadonlySet<number>;
  readonly months: ReadonlySet<number>;
  readonly daysOfWeek: ReadonlySet<number>;
  /** True when the field was written as `*`, which decides how day fields combine. */
  readonly anyDayOfMonth: boolean;
  readonly anyDayOfWeek: boolean;
}

export type CronParse =
  | { readonly parsed: true; readonly fields: CronFields }
  | { readonly parsed: false; readonly reason: string };

export interface CronFieldRange {
  readonly name: string;
  readonly min: number;
  readonly max: number;
}

/** The schedule columns a PROMPT routine is created with. */
export interface PromptRoutineSchedule {
  readonly cron: string | null;
  readonly intervalMinutes: number;
  readonly nextRunAt: Date;
}

/** A cron expression vetted for storage: parsed, real, and not more frequent than the floor. */
export type CronValidation =
  | { readonly valid: true; readonly expression: string; readonly fields: CronFields }
  | { readonly valid: false; readonly reason: string };
