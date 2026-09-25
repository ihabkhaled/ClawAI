import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  type ClawRuntimeProgressEvent,
  EventPattern,
  type ImageFailedPayload,
} from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { ImageGenerationStatus } from '../../../generated/prisma';
import { ImageGenerationRepository } from '../repositories/image-generation.repository';
import { ImageExecutionManager } from '../managers/image-execution.manager';
import { ImagePlanGateManager } from '../managers/image-plan-gate.manager';
import { ImageGenerationEventsService } from './image-generation-events.service';
import {
  type GenerateImageParams,
  type GenerateImageResult,
  type ImageAttemptOptions,
  type ImageFailureDescription,
  type ImageFallbackChainState,
  type ImageGenerationAssetRecord,
  type ImageGenerationLatestSummary,
  type ImageGenerationRecord,
  type ImageGenerationView,
  type ImageReference,
  type ImageSuccessorSpawner,
  TERMINAL_STATUSES,
} from '../types/image-generation.types';
import {
  describeImageFailure,
  isChainTerminalFailureCode,
  isCreditFailureCode,
} from '../utilities/image-failure.utility';
import { toImageProgressSnapshot } from '../utilities/image-progress.utility';
import { imageFailure } from '../adapter.utilities/provider-error.utility';
import { ImageFailureCode } from '../../../common/enums';
import { successorDataFrom, toLatestSummary } from '../utilities/image-supersession.utility';
import { type ListImagesQueryDto } from '../dto/generate-image.dto';
import { BusinessException } from '../../../common/errors';
import { IMAGE_FALLBACK_CHAIN, IMAGE_LOCAL_PROVIDERS } from '../../../common/constants';
import {
  IMAGE_AUTO_FALLBACK_MAX_ATTEMPTS,
  IMAGE_GENERATION_SUPERSEDED_CODE,
  IMAGE_SUPERSESSION_MAX_HOPS,
} from '../constants/image-supersession.constants';

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);

  constructor(
    private readonly repository: ImageGenerationRepository,
    private readonly executionManager: ImageExecutionManager,
    private readonly eventsService: ImageGenerationEventsService,
    private readonly rabbitMQ: RabbitMQService,
    private readonly planGate: ImagePlanGateManager,
  ) {}

  /**
   * The one entry for a new generation or edit, from chat (internal route) or
   * any other caller. The plan gate runs FIRST (ADR-122): a refused user leaves
   * no row, no event, no PAYG hold and no provider call behind.
   */
  async enqueueGeneration(params: GenerateImageParams): Promise<ImageGenerationRecord> {
    await this.planGate.assertCanGenerate(params.userId);
    const record = await this.repository.create({
      userId: params.userId,
      threadId: params.threadId,
      userMessageId: params.userMessageId,
      assistantMessageId: params.assistantMessageId,
      prompt: params.prompt,
      provider: params.provider,
      model: params.model,
      width: params.width,
      height: params.height,
      quality: params.quality,
      style: params.style,
    });
    const reference = await this.storeReference(record.id, params);

    await this.repository.createEvent({
      generationId: record.id,
      status: 'QUEUED',
      payloadJson: { provider: record.provider, model: record.model },
    });

    this.eventsService.publish({
      generationId: record.id,
      status: 'QUEUED',
      provider: record.provider,
      model: record.model,
    });

    this.logger.log(
      `image_generation.enqueued id=${record.id} thread=${record.threadId ?? 'none'} userMessage=${record.userMessageId ?? 'none'} reference=${String(reference !== undefined)}`,
    );

    // Fire-and-forget: process the job asynchronously
    void this.processJobWithFallback(record.id, params.isAutoMode ?? false, reference);

    return record;
  }

  async getById(id: string): Promise<ImageGenerationRecord> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new BusinessException(
        'Image generation not found',
        'IMAGE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    return record;
  }

  /**
   * The owner's generation, or the SAME 404 a missing id gets.
   *
   * A stranger must not be able to tell "exists but not yours" from "does not
   * exist", so both paths throw the identical exception.
   */
  async getByIdForUser(id: string, userId: string): Promise<ImageGenerationRecord> {
    const record = await this.getById(id);
    if (record.userId !== userId) {
      throw new BusinessException(
        'Image generation not found',
        'IMAGE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }
    return record;
  }

  /**
   * `GET /images/:id`: the owner's row plus `latest`, the head of its
   * supersession chain — what an AUTO fallback or a retry-alternate actually
   * produced. A card restored after a refresh renders `latest`, so a fallback
   * that succeeded is no longer hidden behind the original FAILED row.
   */
  async getWithLatestForUser(id: string, userId: string): Promise<ImageGenerationView> {
    const record = await this.getByIdForUser(id, userId);
    const latest = await this.resolveLatest(record, userId);
    // A link the walk refused to follow is not shown either — not even its id.
    const ownLink = latest.id === record.id ? latest.supersededById : record.supersededById;
    return { ...record, supersededById: ownLink, latest };
  }

  /**
   * Owner-only retry for the public route. `retryGeneration` itself trusts its
   * caller (the service-token-guarded internal route); a user-facing route that
   * called it directly let any user re-run — and bill — someone else's job.
   */
  async retryGenerationForUser(
    generationId: string,
    userId: string,
  ): Promise<ImageGenerationRecord> {
    await this.getByIdForUser(generationId, userId);
    return this.retryGeneration(generationId);
  }

  /** Owner-only alternate-model retry for the public route; see `retryGenerationForUser`. */
  async retryWithAlternateModelForUser(
    generationId: string,
    userId: string,
    provider?: string,
    model?: string,
  ): Promise<ImageGenerationRecord> {
    await this.getByIdForUser(generationId, userId);
    return this.retryWithAlternateModel(generationId, provider, model);
  }

  async listByUser(
    userId: string,
    query: ListImagesQueryDto,
  ): Promise<{
    data: ImageGenerationRecord[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const [data, total] = await Promise.all([
      this.repository.findByUserId(userId, query.page, query.limit),
      this.repository.countByUserId(userId),
    ]);
    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async retryGeneration(generationId: string): Promise<ImageGenerationRecord> {
    this.logger.log(`retryGeneration: retrying generation ${generationId}`);
    const record = await this.getById(generationId);
    this.assertChainHead(record);
    // A retry is a new paid run for the job's owner; a plan that lost the
    // feature since (downgrade, expired trial) must not re-run it.
    await this.planGate.assertCanGenerate(record.userId);

    await this.repository.updateStatus(generationId, ImageGenerationStatus.QUEUED, {
      errorCode: undefined,
      errorMessage: undefined,
    });

    await this.repository.createEvent({
      generationId,
      status: ImageGenerationStatus.QUEUED,
      payloadJson: { retried: true },
    });

    this.eventsService.publish({
      generationId,
      status: 'QUEUED',
      provider: record.provider,
      model: record.model,
    });

    this.logger.log(`image_generation.retried id=${generationId}`);
    // No in-memory reference on a retry: processJob reads the stored one.
    void this.processJob(generationId);

    return this.getById(generationId);
  }

  async retryWithAlternateModel(
    generationId: string,
    provider?: string,
    model?: string,
  ): Promise<ImageGenerationRecord> {
    this.logger.log(
      `retryWithAlternateModel: retrying generation ${generationId} with provider=${provider ?? 'auto'} model=${model ?? 'auto'}`,
    );
    const record = await this.getById(generationId);
    this.assertChainHead(record);
    await this.planGate.assertCanGenerate(record.userId);
    const { targetProvider, targetModel } = this.resolveAlternateModel(record, provider, model);
    const newRecord = await this.cloneAsAlternate(record, targetProvider, targetModel);

    this.logger.log(
      `image_generation.alternate id=${newRecord.id} from=${record.provider}/${record.model} to=${targetProvider}/${targetModel}`,
    );

    void this.processJob(newRecord.id);
    return newRecord;
  }

  /**
   * Only the head of a chain may be retried. A superseded row already handed
   * its job on; re-running it would start a second, invisible branch — billed,
   * and pointed at by nothing.
   */
  private assertChainHead(record: ImageGenerationRecord): void {
    if (record.supersededById !== null) {
      throw new BusinessException(
        'This image generation was already continued by another attempt',
        IMAGE_GENERATION_SUPERSEDED_CODE,
        HttpStatus.CONFLICT,
      );
    }
  }

  /**
   * Follows `supersededById` from the asked-for row to the newest one, at most
   * `IMAGE_SUPERSESSION_MAX_HOPS` links. Every hop is owner-checked: a link to
   * a missing row or to someone else's row ends the walk at the last row this
   * user owns, and that row's link is reported as null, so the chain can never
   * be used to read — or even name — another user's job. A walk cut short by
   * the hop bound keeps its link, so a reader can continue from `latest`.
   */
  private async resolveLatest(
    record: ImageGenerationRecord,
    userId: string,
  ): Promise<ImageGenerationLatestSummary> {
    let current = record;
    for (let hop = 0; hop < IMAGE_SUPERSESSION_MAX_HOPS; hop++) {
      if (current.supersededById === null) {
        break;
      }
      const next = await this.repository.findById(current.supersededById);
      if (next?.userId !== userId) {
        this.logger.warn(`resolveLatest: chain from ${record.id} stops at ${current.id}`);
        return { ...toLatestSummary(current), supersededById: null };
      }
      current = next;
    }
    return toLatestSummary(current);
  }

  /**
   * Keeps the reference image a retry will need. Only a file-service upload
   * (`referenceFileId`) is stored, and only as its id — the bytes already live
   * in file-service. A caller that sends bare base64 still gets it used on this
   * send; a later retry of that job has nothing to re-read.
   */
  private async storeReference(
    generationId: string,
    params: GenerateImageParams,
  ): Promise<ImageReference | undefined> {
    if (!params.referenceImageBase64) {
      return undefined;
    }
    if (params.referenceFileId && params.referenceImageMimeType) {
      await this.repository.createReferenceAsset({
        generationId,
        fileId: params.referenceFileId,
        mimeType: params.referenceImageMimeType,
      });
    }
    return { base64: params.referenceImageBase64, mimeType: params.referenceImageMimeType };
  }

  private resolveAlternateModel(
    record: ImageGenerationRecord,
    provider?: string,
    model?: string,
  ): { targetProvider: string; targetModel: string } {
    if (provider && model) {
      return { targetProvider: provider, targetModel: model };
    }
    const currentKey = `${record.provider}/${record.model}`;
    const currentIdx = IMAGE_FALLBACK_CHAIN.findIndex(
      (c) => `${c.provider}/${c.model}` === currentKey,
    );
    const next = IMAGE_FALLBACK_CHAIN[currentIdx + 1] ?? IMAGE_FALLBACK_CHAIN[0];
    if (!next || `${next.provider}/${next.model}` === currentKey) {
      throw new BusinessException('No alternate image model available', 'NO_ALTERNATE_MODEL');
    }
    return { targetProvider: next.provider, targetModel: next.model };
  }

  private async cloneAsAlternate(
    record: ImageGenerationRecord,
    targetProvider: string,
    targetModel: string,
  ): Promise<ImageGenerationRecord> {
    const newRecord = await this.repository.createSuccessor(
      record.id,
      successorDataFrom(record, { provider: targetProvider, model: targetModel }, true),
    );

    await this.repository.createEvent({
      generationId: newRecord.id,
      status: ImageGenerationStatus.QUEUED,
      payloadJson: {
        alternateOf: record.id,
        provider: targetProvider,
        model: targetModel,
      },
    });

    this.eventsService.publish({
      generationId: newRecord.id,
      status: 'QUEUED',
      provider: targetProvider,
      model: targetModel,
    });
    this.publishSuperseded(record, newRecord);

    return newRecord;
  }

  /** Tells the predecessor's listeners which row to follow now. */
  private publishSuperseded(
    predecessor: ImageGenerationRecord,
    successor: ImageGenerationRecord,
  ): void {
    this.eventsService.publish({
      generationId: predecessor.id,
      status: predecessor.status,
      provider: successor.provider,
      model: successor.model,
      supersededById: successor.id,
    });
  }

  /**
   * Runs the job, and in AUTO mode lets each failed attempt hand itself to the
   * next provider — EDGE CASE E3.
   *
   * Each attempt is a genuinely separate paid provider call, so each takes its
   * own reservation; there is no way to hold once and attempt N times. The
   * successor is created and linked BEFORE the failure is published (see
   * `spawnFallback`), so the FAILED event a listener sees already names the
   * row to follow. The loop is bounded by the attempt cap.
   */
  private async processJobWithFallback(
    generationId: string,
    isAutoMode: boolean,
    reference: ImageReference | undefined,
  ): Promise<void> {
    const chain: ImageFallbackChainState = { attempts: 0, paidBlocked: false };
    const spawnSuccessor: ImageSuccessorSpawner | undefined = isAutoMode
      ? async (failed, described) => this.spawnFallback(failed, described, chain)
      : undefined;
    let nextId: string | undefined = generationId;
    for (let hop = 0; nextId !== undefined && hop <= IMAGE_AUTO_FALLBACK_MAX_ATTEMPTS; hop++) {
      nextId = await this.processJob(nextId, { reference, spawnSuccessor });
    }
  }

  /**
   * Picks, creates and links the next AUTO attempt after a failure.
   *
   * What must never happen is billing N attempts against a wallet that could
   * only afford one, so the moment an attempt is refused for credit,
   * `paidBlocked` latches and every later candidate is filtered down to the
   * LOCAL providers. It degrades rather than stopping outright because that is
   * decision D4: at zero credit, PAYG is blocked and local keeps working.
   */
  private async spawnFallback(
    failed: ImageGenerationRecord,
    described: ImageFailureDescription,
    chain: ImageFallbackChainState,
  ): Promise<string | undefined> {
    if (isChainTerminalFailureCode(described.errorCode)) {
      this.logger.warn(
        `Auto-fallback skipped for ${failed.id}: ${described.errorCode} — another provider would fail the same way`,
      );
      return undefined;
    }
    if (isCreditFailureCode(described.errorCode)) {
      chain.paidBlocked = true;
    }
    const failedKey = `${failed.provider}/${failed.model}`;
    const next =
      chain.attempts < IMAGE_AUTO_FALLBACK_MAX_ATTEMPTS
        ? this.findNextFallback(failedKey, chain.paidBlocked)
        : undefined;
    if (!next) {
      this.logger.warn('All auto-fallback attempts exhausted');
      return undefined;
    }
    chain.attempts += 1;
    this.logger.log(
      `Auto-fallback attempt ${String(chain.attempts)}: ${failedKey} → ${next.provider}/${next.model}${chain.paidBlocked ? ' (local only — credit refused)' : ''}`,
    );
    const successor = await this.repository.createSuccessor(
      failed.id,
      successorDataFrom(failed, next, false),
    );
    this.eventsService.publish({
      generationId: successor.id,
      status: 'QUEUED',
      provider: next.provider,
      model: next.model,
    });
    return successor.id;
  }

  private findNextFallback(
    currentKey: string,
    localOnly: boolean,
  ): { provider: string; model: string } | undefined {
    const idx = IMAGE_FALLBACK_CHAIN.findIndex((c) => `${c.provider}/${c.model}` === currentKey);
    const remaining = IMAGE_FALLBACK_CHAIN.slice(idx + 1);
    return !localOnly
      ? remaining[0]
      : remaining.find((c) => IMAGE_LOCAL_PROVIDERS.includes(c.provider));
  }

  /**
   * One attempt of one row. Returns the id of the row that took the job over
   * when this attempt failed and a successor was spawned, else undefined.
   */
  private async processJob(
    generationId: string,
    options: ImageAttemptOptions = {},
  ): Promise<string | undefined> {
    const generation = await this.repository.findById(generationId);
    if (!generation) {
      return undefined;
    }

    if ((TERMINAL_STATUSES as readonly string[]).includes(generation.status)) {
      return undefined;
    }

    await this.transitionStatus(generationId, 'STARTING', generation.provider, generation.model);
    await this.transitionStatus(generationId, 'GENERATING', generation.provider, generation.model);

    try {
      const reference = options.reference ?? (await this.readStoredReference(generation));
      await this.executeAndPersistGeneration(generationId, generation, reference);
      return undefined;
    } catch (error: unknown) {
      return this.handleProcessJobFailure(generationId, generation, error, options.spawnSuccessor);
    }
  }

  /** The stored reference for a retry, or undefined when the job never had one. */
  private async readStoredReference(
    generation: ImageGenerationRecord,
  ): Promise<ImageReference | undefined> {
    const asset = await this.repository.findReferenceAsset(generation.id);
    return asset
      ? this.executionManager.loadStoredReference(asset.storageKey, generation.userId)
      : undefined;
  }

  private async executeAndPersistGeneration(
    generationId: string,
    generation: ImageGenerationRecord,
    reference: ImageReference | undefined,
  ): Promise<void> {
    const result = await this.executionManager.execute({
      prompt: generation.prompt,
      provider: generation.provider,
      model: generation.model,
      userId: generation.userId,
      // Fresh per ENTRY into the job, not per generation row. `reserve` is
      // idempotent on (userId, requestId), so reusing the row id would make
      // `POST /images/:id/retry` — which re-runs the SAME row — settle a second
      // real provider call against the first attempt's hold and bill it once.
      requestId: `${generationId}:${randomUUID()}`,
      width: generation.width,
      height: generation.height,
      quality: generation.quality ?? undefined,
      style: generation.style ?? undefined,
      referenceImageBase64: reference?.base64,
      referenceImageMimeType: reference?.mimeType,
      onProgress: (event) => {
        this.publishProgress(generation, event);
      },
    });

    const asset = await this.persistAsset(generationId, generation, result);
    // Settled only now, on the units measured from the provider response: the
    // user is charged for an image that exists as a file AND an asset row.
    await this.executionManager.settle(result.settlement);

    const completedGen = await this.repository.updateStatus(generationId, 'COMPLETED', {
      revisedPrompt: result.revisedPrompt ?? undefined,
      completedAt: new Date(),
      latencyMs: result.latencyMs,
    });

    await this.publishCompletionEvents(generationId, generation, completedGen, asset, result);
    this.logger.log(`image_generation.completed id=${generationId}`);
  }

  /**
   * The asset row for a stored image. The paid hold is still OPEN here; when
   * this fails the hold is RELEASED and the attempt fails as
   * IMAGE_STORAGE_FAILED (chain-terminal: storage is shared, so another
   * provider would lose its image the same way).
   */
  private async persistAsset(
    generationId: string,
    generation: ImageGenerationRecord,
    result: GenerateImageResult,
  ): Promise<ImageGenerationAssetRecord> {
    try {
      await this.transitionStatus(
        generationId,
        'FINALIZING',
        generation.provider,
        generation.model,
      );
      const downloadUrl = `/api/v1/files/download/${result.fileId}`;
      return await this.repository.createAsset({
        generationId,
        storageKey: result.fileId,
        url: downloadUrl,
        downloadUrl,
        mimeType: 'image/png',
        sizeBytes: undefined,
      });
    } catch (error: unknown) {
      await this.executionManager.releaseUnpersisted(result.settlement);
      const detail = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`persistAsset: asset row not written id=${generationId} — ${detail}`);
      throw imageFailure(ImageFailureCode.STORAGE_FAILED);
    }
  }

  /**
   * Forwards a local runtime's progress envelope to the generation's existing
   * SSE stream as the stage plus observed metrics. Not persisted: the event
   * log keeps status transitions, and a node-by-node trace would be write
   * traffic nobody reads after the job ends.
   */
  private publishProgress(
    generation: ImageGenerationRecord,
    event: ClawRuntimeProgressEvent,
  ): void {
    this.eventsService.publish({
      generationId: generation.id,
      status: 'GENERATING',
      provider: generation.provider,
      model: generation.model,
      runtimeProgress: toImageProgressSnapshot(event),
    });
  }

  private async publishCompletionEvents(
    generationId: string,
    generation: ImageGenerationRecord,
    completedGen: ImageGenerationRecord,
    asset: {
      id: string;
      url: string;
      downloadUrl: string;
      mimeType: string;
      width: number | null;
      height: number | null;
      sizeBytes: number | null;
    },
    result: { fileId: string; latencyMs: number },
  ): Promise<void> {
    const assetSummary = {
      id: asset.id,
      url: asset.url,
      downloadUrl: asset.downloadUrl,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      sizeBytes: asset.sizeBytes,
    };

    await this.repository.createEvent({
      generationId,
      status: 'COMPLETED',
      payloadJson: { assets: [assetSummary] },
    });

    this.eventsService.publish({
      generationId,
      status: 'COMPLETED',
      provider: completedGen.provider,
      model: completedGen.model,
      assets: [assetSummary],
    });

    void this.rabbitMQ.publish('image.generated', {
      generationId,
      userId: generation.userId,
      threadId: generation.threadId,
      provider: generation.provider,
      model: generation.model,
      fileId: result.fileId,
      prompt: generation.prompt,
      latencyMs: result.latencyMs,
    });
  }

  /**
   * Lands a failed attempt in a stored, visible state.
   *
   * A generation job is fire-and-forget (`void this.processJobWithFallback(…)`),
   * so this row and the SSE event it publishes are the ONLY places a failure can
   * become visible — there is no HTTP response left to carry a 402. A refused
   * reservation that only ever reached the log would show the user the generic
   * "please try again", and the retry it invites is refused identically.
   *
   * In AUTO mode the successor is spawned BETWEEN storing the failure and
   * publishing it, so the FAILED event already carries `supersededById`.
   */
  private async handleProcessJobFailure(
    generationId: string,
    generation: ImageGenerationRecord,
    error: unknown,
    spawnSuccessor?: ImageSuccessorSpawner,
  ): Promise<string | undefined> {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const described = describeImageFailure(error);
    this.logger.error(
      `image_generation.failed id=${generationId} code=${described.errorCode}: ${errorMsg}`,
    );

    const failed = await this.repository.updateStatus(generationId, 'FAILED', {
      errorCode: described.errorCode,
      errorMessage: described.errorMessage,
      completedAt: new Date(),
    });

    await this.repository.createEvent({
      generationId,
      status: 'FAILED',
      payloadJson: { errorCode: described.errorCode, errorMessage: errorMsg },
    });

    const successorId = await this.spawnSafely(spawnSuccessor, failed, described);
    this.publishFailure(generationId, generation, described, errorMsg, successorId);
    return successorId;
  }

  /** A spawn that throws must not swallow the failure it was answering. */
  private async spawnSafely(
    spawnSuccessor: ImageSuccessorSpawner | undefined,
    failed: ImageGenerationRecord,
    described: ImageFailureDescription,
  ): Promise<string | undefined> {
    if (!spawnSuccessor) {
      return undefined;
    }
    try {
      return await spawnSuccessor(failed, described);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`spawnSuccessor: could not continue ${failed.id} — ${msg}`);
      return undefined;
    }
  }

  private publishFailure(
    generationId: string,
    generation: ImageGenerationRecord,
    described: ImageFailureDescription,
    rawErrorMessage: string,
    supersededById: string | undefined,
  ): void {
    this.eventsService.publish({
      generationId,
      status: 'FAILED',
      provider: generation.provider,
      model: generation.model,
      errorCode: described.errorCode,
      errorMessage: described.errorMessage,
      ...(supersededById === undefined ? {} : { supersededById }),
    });

    // `supersededById` rides the bus event too (optional, additive): an AUTO
    // attempt that failed and handed off is not a terminal failure, and a
    // consumer can tell the two apart without reading image-service's rows.
    const failedEvent: ImageFailedPayload = {
      generationId,
      userId: generation.userId,
      provider: generation.provider,
      model: generation.model,
      prompt: generation.prompt,
      errorCode: described.errorCode,
      errorMessage: rawErrorMessage,
      timestamp: new Date().toISOString(),
      ...(supersededById === undefined ? {} : { supersededById }),
    };
    void this.rabbitMQ.publish(EventPattern.IMAGE_FAILED, failedEvent);
  }

  private async transitionStatus(
    generationId: string,
    status: ImageGenerationStatus,
    provider: string,
    model: string,
  ): Promise<void> {
    const extra = status === 'STARTING' ? { startedAt: new Date() } : {};
    await this.repository.updateStatus(generationId, status, extra);
    await this.repository.createEvent({ generationId, status });
    this.eventsService.publish({ generationId, status, provider, model });
  }
}
