// Browser Credential Management API wrapper. After a successful SPA login or
// registration we explicitly call navigator.credentials.store() so Chrome/
// Edge fire the "Save password?" prompt — they don't reliably detect SPA
// logins via heuristics alone (no real form-navigation submit), even when
// the form has correct autocomplete + name attributes. Subsequent visits
// will then offer the saved credential to autofill the email/password
// fields, because their autoComplete="email" / autoComplete="current-
// password" hints match the stored origin.
//
// Feature-detected and silent on failure: storing credentials is a UX nicety,
// never block the login flow on a browser quirk or a private window where
// the API is unavailable.

type StoreCredentialInput = {
  email: string;
  password: string;
};

// PasswordCredential is part of lib.dom but TS narrows it to undefined in
// some configs; guard the constructor at runtime.
type PasswordCredentialCtor = new (init: {
  id: string;
  password: string;
  name?: string;
}) => Credential;

declare global {
  interface Window {
    PasswordCredential?: PasswordCredentialCtor;
  }
}

export async function saveCredential(input: StoreCredentialInput): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  const Ctor = window.PasswordCredential;
  if (
    Ctor === undefined ||
    typeof navigator === 'undefined' ||
    typeof navigator.credentials?.store !== 'function'
  ) {
    return;
  }
  try {
    const cred = new Ctor({ id: input.email, password: input.password, name: input.email });
    await navigator.credentials.store(cred);
  } catch (error) {
    // Best-effort. Do not surface — the login already succeeded.
    console.warn('saveCredential: browser refused to store credential', error);
  }
}
