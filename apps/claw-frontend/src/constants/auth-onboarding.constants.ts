import type { AuthOnboardingStep } from '@/types';

/**
 * The three things that happen between registering and being able to sign in,
 * in order.
 *
 * Numbered rather than bulleted on purpose: this is a sequence with a gate in
 * it, and a user who has stalled needs to see WHICH step they are stuck on.
 * Extracted from the panel because a TSX file holds render composition only.
 */
export const CHECK_EMAIL_STEPS: readonly AuthOnboardingStep[] = [
  { titleKey: 'auth.checkEmailStep1Title', bodyKey: 'auth.checkEmailStep1Body' },
  { titleKey: 'auth.checkEmailStep2Title', bodyKey: 'auth.checkEmailStep2Body' },
  { titleKey: 'auth.checkEmailStep3Title', bodyKey: 'auth.checkEmailStep3Body' },
] as const;

/**
 * The reasons a confirmation email has not arrived, ordered by how often each
 * one is the real answer. The spam folder is first because it almost always is.
 */
export const CHECK_EMAIL_TROUBLESHOOTING_KEYS: readonly string[] = [
  'auth.checkEmailNotArrivedSpam',
  'auth.checkEmailNotArrivedTypo',
  'auth.checkEmailNotArrivedWait',
] as const;
