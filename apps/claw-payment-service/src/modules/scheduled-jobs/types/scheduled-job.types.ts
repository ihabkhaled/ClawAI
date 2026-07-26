export type ScheduledJobOptions = Readonly<{
  jobName: string;
  lockKey: string;
  lockTtlSeconds: number;
}>;

export type ScheduledJobCallback<TResult> = () => Promise<TResult>;
