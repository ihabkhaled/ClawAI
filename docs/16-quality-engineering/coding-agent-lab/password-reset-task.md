# ClawAI benchmark task — Password Reset, end to end

This is the standing mission brief for the coding-agent lab's flagship
benchmark. The agent under test receives a prompt pointing at this file and
must implement the feature itself, in this repository, with its own tools.

---

Implement Password Reset end to end in this repository.

**Do the work — do not merely describe it.**

Read `CLAUDE.md` and the `rules/` directory first, then run:

```bash
npm run knowledge:context -- --task="password reset"
```

Read `.ai/local/current-context.md` afterwards and follow whatever
repository-specific material it names. Repository conventions override generic
assumptions.

## Discovery before editing

Before editing, discover in this repository:

- the authentication service and its login flow;
- the password hashing implementation and password policy;
- session handling and refresh-token handling;
- the user schema, database ownership, and Prisma/migration conventions;
- the email abstraction and the dev email capture mechanism;
- the configured frontend origin (environment variable, not a literal);
- the i18n implementation and the full set of supported locales;
- the backend, frontend, integration, and E2E test frameworks;
- rate-limiting patterns on existing auth endpoints;
- any existing "Forgot password?" UI and how much is already connected.

## Request-reset endpoint

Implement `POST` request-reset under the auth service's existing route
conventions. Requirements:

- the public response must not reveal whether an account exists;
- cryptographically secure reset token;
- only a token hash is stored at rest — never the raw token;
- bounded expiry;
- single-use semantics, replay-safe and race-safe (atomic consumption);
- secure lookup/indexing;
- no reset token and no password in any log;
- follow the repository's existing rate-limiting conventions.

## Confirm-reset endpoint

Implement `POST` confirm-reset under the same conventions. Requirements:

- validate the reset token securely;
- reject malformed, invalid, expired, and consumed tokens;
- consume the token atomically — two concurrent confirms cannot both succeed;
- reuse the existing password hashing path and password policy;
- follow the existing session and refresh-token security policy after a
  password change;
- prevent replay.

## Persistence

Create the required Prisma migration following repository naming conventions,
with appropriate indexes for secure token lookup and expiry cleanup.

## Email

Send through the repository's existing mail abstraction. Construct the reset
URL from the configured frontend origin — never hard-code a production URL. Do
not log the raw token, passwords, or the secret reset URL.

## Frontend

Complete the forgot-password and reset-password UX: validation, loading
states, request-success state, invalid-token state, expired-token state,
malformed-URL handling, success state, safe error handling, accessible labels,
keyboard-accessible form flow, correct focus order.

No hard-coded user-facing strings: every string goes through the repository's
i18n mechanism, and every supported locale receives a real translation
following repository conventions, in the same change.

## Tests

Add meaningful tests covering at minimum: valid reset; invalid token; expired
token; reused token; malformed token; password-policy rejection; non-existent
account non-enumeration; email dispatch; reset-link construction; old password
rejected after reset; new password accepted; required session/refresh-token
behaviour; replay prevention; rate limiting where practical; atomic single-use
behaviour.

## End-to-end proof

Do not stop after unit tests. Execute the real dev workflow with your tools:

1. seed or create a test user;
2. authenticate with the original password;
3. request a password reset;
4. capture the generated reset email through the development mail path;
5. extract and follow the reset link;
6. set a new password and verify the reset succeeds;
7. retry the same token and verify it fails;
8. authenticate with the old password and verify it fails;
9. authenticate with the new password and verify it succeeds;
10. verify a random invalid token fails safely;
11. verify an expired token fails safely;
12. verify request-reset responses are indistinguishable for existing and
    non-existing accounts.

## Quality gates

For every workspace you touch, run the applicable typecheck, lint, unit,
integration, and build gates, and fix failures. Do not silence findings with
`eslint-disable`, `@ts-ignore`, `any`, or a non-null `!`.

## Completion report

Report at the end: files created; files modified; the migration and its
execution result; commands executed with their real results; tests executed
with their real results; E2E evidence; security properties; session behaviour;
unresolved issues. Never claim a command executed unless it actually executed.
Never claim success without evidence.
