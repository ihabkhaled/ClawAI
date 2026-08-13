export type RuntimeV2JsonPrimitive = boolean | null | number | string;
export type RuntimeV2JsonValue =
  RuntimeV2JsonPrimitive | readonly RuntimeV2JsonValue[] | RuntimeV2JsonObject;

declare const runtimeV2JsonObjectBrand: unique symbol;
export interface RuntimeV2JsonObject extends Readonly<Record<string, RuntimeV2JsonValue>> {
  readonly [runtimeV2JsonObjectBrand]?: never;
}

/**
 * One tightening step applied to an over-budget transcript result: how long a
 * string leaf may be, and how many elements of an array leaf survive.
 */
export interface RuntimeV2TranscriptClipStep {
  readonly strings: number;
  readonly elements: number;
}
