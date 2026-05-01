import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '../../../common/errors';
import { ModelsLifecycleService } from '../../models-lifecycle/services/models-lifecycle.service';

@Injectable()
export class InferenceService {
  private readonly logger = new Logger(InferenceService.name);

  constructor(private readonly lifecycle: ModelsLifecycleService) {}

  assertReady(): { port: number } {
    this.logger.debug('assertReady: checking resident model');
    const port = this.lifecycle.getResidentPort();
    if (!port) {
      throw new BusinessException(
        'No model loaded',
        'NO_MODEL_LOADED',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { port };
  }
}
