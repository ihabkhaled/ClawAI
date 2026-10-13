/** The request was understood and refused because the account may not do it (plan or role). */
export const HTTP_STATUS_FORBIDDEN = 403;

/** The account lacks the credit the selected model needs. */
export const HTTP_STATUS_PAYMENT_REQUIRED = 402;

/** The Thread does not exist, or it belongs to another account (the service never says which). */
export const HTTP_STATUS_NOT_FOUND = 404;

/** The Thread is busy: it cannot be deleted or retried while a job is still running. */
export const HTTP_STATUS_CONFLICT = 409;
