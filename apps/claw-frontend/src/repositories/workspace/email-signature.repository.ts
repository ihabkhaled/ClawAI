import { apiClient } from '../../services/shared/api-client';
import type {
  CreateEmailSignatureRequest,
  EmailSignature,
  UpdateEmailSignatureRequest,
} from '../../types/email-signature.types';

const BASE = '/workspace/email-signatures';

export async function listEmailSignatures(): Promise<EmailSignature[]> {
  const response = await apiClient.get<EmailSignature[]>(BASE);
  return response.data;
}

export async function createEmailSignature(
  payload: CreateEmailSignatureRequest,
): Promise<EmailSignature> {
  const response = await apiClient.post<EmailSignature>(BASE, payload);
  return response.data;
}

export async function updateEmailSignature(
  id: string,
  payload: UpdateEmailSignatureRequest,
): Promise<EmailSignature> {
  const response = await apiClient.patch<EmailSignature>(
    `${BASE}/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data;
}

export async function deleteEmailSignature(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${encodeURIComponent(id)}`);
}
