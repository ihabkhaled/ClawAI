import { API_BASE_URL } from '@/constants';
import { PUBLIC_FEEDBACK_PATH } from '@/constants/feedback.constants';
import { ApiClientError } from '@/services/shared/api-client';
import type {
  CreatePublicFeedbackRequest,
  CreatePublicFeedbackResponse,
} from '@/types/feedback.types';

// The signed-out endpoint. It deliberately does not go through the axios
// client: that client attaches a stored bearer token and, on a 401, tries to
// refresh a session and redirect to /login. A visitor's message must carry no
// credentials at all and must never trigger either.
export const feedbackPublicRepository = {
  async create(payload: CreatePublicFeedbackRequest): Promise<CreatePublicFeedbackResponse> {
    const response = await fetch(`${API_BASE_URL}${PUBLIC_FEEDBACK_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new ApiClientError({ message: 'Public feedback failed', status: response.status });
    }
    return (await response.json()) as CreatePublicFeedbackResponse;
  },
};
