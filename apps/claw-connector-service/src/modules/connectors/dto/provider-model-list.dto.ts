import { z } from 'zod';

// Inbound contracts for OpenAI-compatible preset model lists (ADR-117).
//
// These validate a THIRD PARTY's response, so every field but the id is
// optional and nullable, and unknown fields are dropped. Entries are parsed one
// at a time by the caller: one malformed model must not hide the other 400.

const stringList = z.array(z.string()).nullish();

export const openAICompatibleModelEntrySchema = z.object({
  id: z.string().min(1).max(300),
  name: z.string().max(300).nullish(),
  display_name: z.string().max(300).nullish(),
  type: z.string().max(50).nullish(),
  context_length: z.number().int().positive().nullish(),
  context_window: z.number().int().positive().nullish(),
  active: z.boolean().nullish(),
  tags: stringList,
  supported_parameters: stringList,
  architecture: z.object({ input_modalities: stringList, output_modalities: stringList }).nullish(),
  modalities: z.object({ input: stringList, output: stringList }).nullish(),
  capabilities: z
    .object({
      completion_chat: z.boolean().nullish(),
      function_calling: z.boolean().nullish(),
      vision: z.boolean().nullish(),
    })
    .nullish(),
  metadata: z
    .object({ context_length: z.number().int().positive().nullish(), tags: stringList })
    .nullish(),
});

export const openAICompatibleModelListSchema = z.object({ data: z.array(z.unknown()) });

export const bareModelListSchema = z.array(z.unknown());

export const cohereModelEntrySchema = z.object({
  name: z.string().min(1).max(300),
  endpoints: stringList,
  features: stringList,
  context_length: z.number().int().positive().nullish(),
  is_deprecated: z.boolean().nullish(),
});

export const cohereModelListSchema = z.object({ models: z.array(z.unknown()) });

export const cloudflareModelEntrySchema = z.object({
  name: z.string().min(1).max(300),
  task: z.object({ name: z.string().nullish() }).nullish(),
});

export const cloudflareModelListSchema = z.object({ result: z.array(z.unknown()) });

export type OpenAICompatibleModelEntry = z.infer<typeof openAICompatibleModelEntrySchema>;
export type CohereModelEntry = z.infer<typeof cohereModelEntrySchema>;
export type CloudflareModelEntry = z.infer<typeof cloudflareModelEntrySchema>;
