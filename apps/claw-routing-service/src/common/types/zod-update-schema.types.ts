import type { z } from 'zod';

/** A create schema's shape with every field optional and no field defaulted. */
export type WithoutDefaults<T extends z.ZodRawShape> = {
  [K in keyof T]: T[K] extends z.ZodDefault<infer Inner>
    ? z.ZodOptional<Inner>
    : z.ZodOptional<T[K]>;
};
