export type RuntimeV2JsonPrimitive = boolean | null | number | string;
export type RuntimeV2JsonValue =
  RuntimeV2JsonPrimitive | readonly RuntimeV2JsonValue[] | RuntimeV2JsonObject;

declare const runtimeV2JsonObjectBrand: unique symbol;
export interface RuntimeV2JsonObject extends Readonly<Record<string, RuntimeV2JsonValue>> {
  readonly [runtimeV2JsonObjectBrand]?: never;
}
