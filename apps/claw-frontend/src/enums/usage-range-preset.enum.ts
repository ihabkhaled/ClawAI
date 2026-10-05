/** Period choices on the admin usage views. Each maps to a server query in `usage-analytics.utility.ts`. */
export enum UsageRangePreset {
  Today = 'TODAY',
  Hours = 'HOURS',
  Week = 'WEEK',
  Month = 'MONTH',
  Custom = 'CUSTOM',
}
