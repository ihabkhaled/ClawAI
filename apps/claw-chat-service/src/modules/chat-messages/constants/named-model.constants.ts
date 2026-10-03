import type { NamedModelNoticeReason } from '@claw/shared-types';

/**
 * Why a model the user named ("use grok") was not used, in the words the
 * answering model is given. It writes the one-line notice in the user's own
 * language, so the sentence needs no translation table.
 */
export const NAMED_MODEL_NOTICE_REASONS: Readonly<Record<NamedModelNoticeReason, string>> = {
  NOT_CONFIGURED: 'it is not set up in this workspace',
  NOT_IN_PLAN: "it is not included in the user's current plan",
  CONNECTOR_DOWN: 'its provider is temporarily unavailable',
  NO_FITTING_MODEL:
    'it has no model that can do what was asked (for example make a picture or video)',
};
