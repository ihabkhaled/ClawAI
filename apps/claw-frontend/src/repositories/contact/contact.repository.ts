import { ContactResponseCode } from '@/enums/contact-response-code.enum';
import type { ContactFormValues } from '@/lib/validation/contact.schema';
import type { ContactFormResult, ContactSubmitResponse } from '@/types/contact.types';

// Talks to the local Next.js route handler at /api/contact (NOT a backend
// /api/v1 service), so it uses fetch directly rather than the axios apiClient.
// This is the single wrapper for the endpoint — nothing else calls fetch here.
export const contactRepository = {
  async submit(values: ContactFormValues): Promise<ContactFormResult> {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    const payload = (await response.json().catch(() => null)) as ContactSubmitResponse | null;
    const code = payload?.code ?? ContactResponseCode.ERROR;

    if (!response.ok) {
      // Reject so TanStack Query routes this through onError; carry the code.
      throw new ContactSubmitError(code);
    }
    return { code };
  },
};

export class ContactSubmitError extends Error {
  readonly code: ContactResponseCode;

  constructor(code: ContactResponseCode) {
    super(`contact submission failed: ${code}`);
    this.name = 'ContactSubmitError';
    this.code = code;
  }
}
