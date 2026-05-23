import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '../../../common/errors';
import { CatalogRepository } from '../../catalog/repositories/catalog.repository';
import { ModelsLifecycleService } from '../../models-lifecycle/services/models-lifecycle.service';

@Injectable()
export class InferenceService {
  private readonly logger = new Logger(InferenceService.name);

  constructor(
    private readonly lifecycle: ModelsLifecycleService,
    private readonly catalogRepo: CatalogRepository,
  ) {}

  async ensureReady(requestedModel?: string): Promise<{ port: number }> {
    this.logger.debug(`ensureReady: requestedModel=${requestedModel ?? '(none)'}`);
    const loaded = await this.lifecycle.getLoaded();
    if (loaded && loaded.port !== null) {
      if (!requestedModel || this.matches(loaded, requestedModel)) {
        return { port: loaded.port };
      }
      this.logger.log(
        `ensureReady: swap requested — loaded=${loaded.name}:${loaded.tag} requested=${requestedModel}`,
      );
    }
    if (!requestedModel) {
      throw new BusinessException(
        'No model loaded',
        'NO_MODEL_LOADED',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const entry = await this.resolveEntry(requestedModel);
    const next = await this.lifecycle.load(entry.id);
    if (next.port === null) {
      throw new BusinessException(
        'Model load returned no port',
        'MODEL_LOAD_FAILED',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { port: next.port };
  }

  assertReady(): { port: number } {
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

  private matches(loaded: { name: string; tag: string }, requestedModel: string): boolean {
    const slug = `${loaded.name}:${loaded.tag}`;
    return requestedModel === slug || requestedModel === loaded.name;
  }

  private async resolveEntry(
    requestedModel: string,
  ): Promise<NonNullable<Awaited<ReturnType<typeof this.catalogRepo.findById>>>> {
    if (requestedModel.includes(':')) {
      const [name, tag] = requestedModel.split(':', 2) as [string, string];
      const byNameTag = await this.catalogRepo.findByName(name, tag);
      if (byNameTag) return byNameTag;
    }
    const byId = await this.catalogRepo.findById(requestedModel);
    if (byId) return byId;
    throw new BusinessException(
      `Unknown llamacpp model: ${requestedModel}`,
      'MODEL_NOT_FOUND',
      HttpStatus.NOT_FOUND,
    );
  }
}
