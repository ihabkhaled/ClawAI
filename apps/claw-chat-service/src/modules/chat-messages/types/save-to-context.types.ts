import type { SaveIntentMemoryType } from '@claw/shared-utilities';

export type ConfirmationLocale =
  'ar' | 'de' | 'en' | 'es' | 'fa' | 'fr' | 'hi' | 'it' | 'ja' | 'pt' | 'ru' | 'th' | 'zh';

export type SaveFailureReason = 'PLAN' | 'LIMIT' | 'UNAVAILABLE';

export type SaveConfirmationTemplates = {
  memory: string;
  pack: string;
  ask: string;
  failed: string;
  reasons: Record<SaveFailureReason, string>;
  types: Record<SaveIntentMemoryType, string>;
};

/** What a "save this" turn did; rendered into the assistant's reply. */
export type SaveToContextOutcome =
  | {
      kind: 'MEMORY';
      memoryId: string;
      memoryType: SaveIntentMemoryType;
      size: number;
      preview: string;
      created: boolean;
    }
  | { kind: 'PACK'; packId: string; name: string; size: number; created: boolean }
  | { kind: 'ASK' }
  | { kind: 'FAILED'; reason: SaveFailureReason };

export type SaveMemoryFromChatResponse = {
  memory?: { id: string; type: string; content: string };
  created?: boolean;
};

export type SavePackFromChatResponse = { created?: boolean; packId?: string; name?: string };

export type SaveServiceErrorBody = { code?: string; error?: { code?: string } };
