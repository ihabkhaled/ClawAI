import { HttpStatus, Injectable } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import type { HttpResponse } from '../../../common/types';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import { buildInterServiceAuthHeader } from '../../../common/utilities/inter-service-auth.utility';
import { DEFAULT_MAX_OUTPUT_TOKENS } from '../constants/execution-fast-path.constants';
import {
  RUNTIME_V2_ADMISSION_PATH,
  RUNTIME_V2_ADMISSION_TIMEOUT_MS,
} from '../constants/runtime-v2-access.constants';
import type { RuntimeStartDto } from '../dto/runtime-v2.dto';
import {
  type RuntimeV2AdmissionAck,
  runtimeV2AdmissionAckSchema,
} from '../types/runtime-v2-access.types';
import { estimateTokensFromText } from '../utilities/token-estimator.utility';

@Injectable()
export class RuntimeV2AccessService {
  async reserveStart(userId: string, request: RuntimeStartDto): Promise<RuntimeV2AdmissionAck> {
    const estimatedTokens = estimateTokensFromText(request.prompt) + DEFAULT_MAX_OUTPUT_TOKENS;
    const response = await this.requestAdmission('', {
      userId,
      requestId: request.clientRequestId,
      provider: request.provider,
      model: request.model,
      estimatedTokens,
    });
    if (!response.ok) this.throwAdmissionError(response.status);
    const acknowledgement = runtimeV2AdmissionAckSchema.safeParse(response.data);
    if (!acknowledgement.success || acknowledgement.data.requestId !== request.clientRequestId) {
      throw this.unavailable();
    }
    return acknowledgement.data;
  }

  async releaseStart(userId: string, requestId: string): Promise<void> {
    const response = await this.requestAdmission('/release', { userId, requestId });
    if (!response.ok) throw this.unavailable();
  }

  private requestAdmission(
    suffix: string,
    body: Readonly<Record<string, string | number>>,
  ): Promise<HttpResponse<unknown>> {
    return httpRequest<unknown>({
      url: `${AppConfig.get().AUTH_SERVICE_URL}${RUNTIME_V2_ADMISSION_PATH}${suffix}`,
      method: 'POST',
      headers: { Authorization: buildInterServiceAuthHeader() },
      body,
      timeoutMs: RUNTIME_V2_ADMISSION_TIMEOUT_MS,
    }).catch(() => {
      throw this.unavailable();
    });
  }

  private throwAdmissionError(status: number): never {
    if (status === HttpStatus.FORBIDDEN) {
      throw new BusinessException(
        'Runtime permission or model access is denied',
        'RUNTIME_ADMISSION_DENIED',
        HttpStatus.FORBIDDEN,
      );
    }
    if (status === HttpStatus.CONFLICT) {
      throw new BusinessException(
        'Runtime admission conflicts with an earlier request',
        'RUNTIME_ADMISSION_CONFLICT',
        HttpStatus.CONFLICT,
      );
    }
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      throw new BusinessException(
        'Runtime token quota is exhausted',
        'RUNTIME_QUOTA_EXCEEDED',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    throw this.unavailable();
  }

  private unavailable(): BusinessException {
    return new BusinessException(
      'Runtime admission is temporarily unavailable',
      'RUNTIME_ADMISSION_UNAVAILABLE',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
