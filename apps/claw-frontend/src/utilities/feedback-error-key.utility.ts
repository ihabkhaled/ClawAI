import {
  PUBLIC_FEEDBACK_STATUS_INVALID,
  PUBLIC_FEEDBACK_STATUS_RATE_LIMITED,
} from '@/constants/feedback.constants';
import { ApiClientError } from '@/services/shared/api-client';

// Which translated message a failed public feedback request gets.
export function publicFeedbackErrorKey(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === PUBLIC_FEEDBACK_STATUS_RATE_LIMITED) {
      return 'feedback.errors.rateLimited';
    }
    if (error.status === PUBLIC_FEEDBACK_STATUS_INVALID) {
      return 'feedback.errors.checkFields';
    }
  }
  return 'feedback.errors.submitFailed';
}
