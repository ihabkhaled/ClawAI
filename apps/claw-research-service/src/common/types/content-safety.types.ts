export type InjectionFilterResult = {
  text: string;
  detected: string[];
};

export type SecretRedactionResult = {
  text: string;
  redactedCount: number;
};

export type ContentSafetyResult = {
  text: string;
  detected: string[];
  redactedCount: number;
};
