import { EmailVerificationTone } from '@/enums';

/**
 * The icon badge styling for each verification tone.
 *
 * A lookup rather than a ternary chain in the panel: four outcomes rendered
 * through nested ternaries is where the wrong colour ends up on the wrong
 * state, and the TSX file is supposed to hold composition only.
 */
export const EMAIL_VERIFICATION_TONE_BADGE_CLASS: Record<EmailVerificationTone, string> = {
  [EmailVerificationTone.Pending]: 'bg-muted text-muted-foreground',
  [EmailVerificationTone.Success]: 'bg-success/10 text-success',
  [EmailVerificationTone.Neutral]: 'bg-primary/10 text-primary',
  [EmailVerificationTone.Failure]: 'bg-destructive/10 text-destructive',
};
