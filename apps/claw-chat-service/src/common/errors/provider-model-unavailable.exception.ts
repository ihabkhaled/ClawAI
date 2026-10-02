import { HttpStatus } from '@nestjs/common';
import { BusinessException } from './business.exception';
import {
  PROVIDER_MODEL_UNAVAILABLE_CODE,
  PROVIDER_MODEL_UNAVAILABLE_MESSAGE,
  PROVIDER_MODEL_UNAVAILABLE_MESSAGE_KEY,
} from '../../modules/chat-messages/constants/provider-model-unavailable.constants';

/**
 * The provider said the picked model does not exist any more (404
 * `model_not_found`, "has been deprecated", "decommissioned"). It is the MODEL
 * that is gone, not the provider, so the picked-model fallback may substitute
 * (ADR-151) and the failure is reported to connector-service, which retires the
 * row after a few repeats. The message is a fixed sentence: provider text is
 * never kept on this error.
 */
export class ProviderModelUnavailableException extends BusinessException {
  constructor() {
    super(
      PROVIDER_MODEL_UNAVAILABLE_MESSAGE,
      PROVIDER_MODEL_UNAVAILABLE_CODE,
      HttpStatus.NOT_FOUND,
      PROVIDER_MODEL_UNAVAILABLE_MESSAGE_KEY,
    );
  }
}
