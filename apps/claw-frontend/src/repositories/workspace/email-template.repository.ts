import { apiClient } from '../../services/shared/api-client';
import type {
  CreateEmailTemplateRequest,
  EmailTemplate,
  UpdateEmailTemplateRequest,
} from '../../types/email-template.types';

const BASE = '/workspace/email-templates';

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const response = await apiClient.get<EmailTemplate[]>(BASE);
  return response.data;
}

export async function createEmailTemplate(
  payload: CreateEmailTemplateRequest,
): Promise<EmailTemplate> {
  const response = await apiClient.post<EmailTemplate>(BASE, payload);
  return response.data;
}

export async function updateEmailTemplate(
  id: string,
  payload: UpdateEmailTemplateRequest,
): Promise<EmailTemplate> {
  const response = await apiClient.patch<EmailTemplate>(
    `${BASE}/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${encodeURIComponent(id)}`);
}
