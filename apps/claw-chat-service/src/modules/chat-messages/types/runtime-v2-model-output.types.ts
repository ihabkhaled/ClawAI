export type RuntimeV2ModelOutput =
  | { readonly kind: 'final'; readonly content: string }
  | {
      readonly kind: 'tool';
      readonly toolName: string;
      readonly toolVersion: string;
      readonly operation: string;
      readonly arguments: Readonly<Record<string, unknown>>;
      readonly targetId: string;
    };
