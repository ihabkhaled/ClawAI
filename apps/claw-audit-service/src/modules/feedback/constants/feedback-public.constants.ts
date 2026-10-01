// Public (no-login) feedback: every limit that bounds an anonymous caller.

// Per hour. Two budgets because they stop different abuse: the address budget
// stops one machine flooding, the email budget stops one inbox being named by
// many machines. Both run for every submission, whether or not the address
// belongs to an account, so a 429 never says anything about accounts (rule 43).
export const FEEDBACK_PUBLIC_IP_LIMIT = 5;
export const FEEDBACK_PUBLIC_EMAIL_LIMIT = 3;
export const FEEDBACK_PUBLIC_WINDOW_SECONDS = 3600;

export const FEEDBACK_PUBLIC_RATE_KEY_PREFIX = 'feedback:public:';

export const FEEDBACK_PUBLIC_NAME_MAX_LENGTH = 120;
export const FEEDBACK_PUBLIC_EMAIL_MAX_LENGTH = 255;
export const FEEDBACK_PUBLIC_PAGE_URL_MAX_LENGTH = 2048;
export const FEEDBACK_PUBLIC_LOCALE_MAX_LENGTH = 50;
export const FEEDBACK_PUBLIC_HONEYPOT_MAX_LENGTH = 500;

// Raw (pre-clean) caps so a hostile string cannot make the cleaning pass itself
// expensive. The cleaned value is then held to the real limits above.
export const FEEDBACK_PUBLIC_RAW_SLACK = 4;

// A title is optional on the public form; when absent it is the first words of
// the message.
export const FEEDBACK_PUBLIC_DERIVED_TITLE_LENGTH = 80;

// Stored in place of an actor id on the history entry: nobody was signed in.
export const FEEDBACK_PUBLIC_ACTOR_ID = 'public';

// Used when nginx did not supply X-Real-IP (direct service access in dev).
export const FEEDBACK_UNKNOWN_CLIENT = 'unknown';
export const FEEDBACK_REAL_IP_HEADER = 'x-real-ip';

export const FEEDBACK_IDENTITY_TIMEOUT_MS = 3000;
