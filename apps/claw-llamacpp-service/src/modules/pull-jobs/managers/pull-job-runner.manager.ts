import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { request } from 'undici';
import { computeSha256, HuggingFaceClient, resolveSafePath } from '../../../common/utilities';
import { AppConfig } from '../../../app/config/app.config';
import { DownloadStatus, PullJobStatus, PullReasonCode } from '../../../common/enums';
import { LlamacppEventsPublisher } from '../../../common/events/llamacpp-events.publisher';
import { CatalogRepository } from '../../catalog/repositories/catalog.repository';
import { PullJobsRepository } from '../repositories/pull-jobs.repository';
import { PullJobProgressEmitterManager } from './pull-job-progress-emitter.manager';
import {
  DOWNLOAD_RETRY_BASE_MS,
  DOWNLOAD_RETRY_MAX,
  PROGRESS_DB_THROTTLE_MS,
} from '../constants/pull-job.constants';
import { type PullJob } from '../types/pull-job.types';

@Injectable()
export class PullJobRunnerManager {
  private readonly logger = new Logger(PullJobRunnerManager.name);
  private readonly cancellations = new Map<string, AbortController>();

  constructor(
    private readonly jobsRepo: PullJobsRepository,
    private readonly catalogRepo: CatalogRepository,
    private readonly progressEmitter: PullJobProgressEmitterManager,
    private readonly events: LlamacppEventsPublisher,
  ) {}

  cancel(jobId: string): void {
    const controller = this.cancellations.get(jobId);
    if (controller) {
      this.logger.log(`cancel: aborting ${jobId}`);
      controller.abort();
    }
  }

  async run(jobId: string): Promise<void> {
    this.logger.log(`run: starting job ${jobId}`);
    const controller = new AbortController();
    this.cancellations.set(jobId, controller);
    try {
      const prepared = await this.prepareJob(jobId);
      if (prepared === null) return;
      const { job, entry, client, files, modelDir } = prepared;
      const downloadedBytes = await this.downloadAllFiles(
        jobId,
        job,
        entry,
        client,
        files,
        modelDir,
        controller,
      );
      if (downloadedBytes === null) return;
      await this.markCompleted(jobId, entry.id, downloadedBytes);
    } catch (error) {
      this.logger.error(`run: ${jobId} failed — ${(error as Error).message}`);
      await this.markFailed(jobId, PullReasonCode.UNKNOWN, (error as Error).message);
    } finally {
      this.cancellations.delete(jobId);
    }
  }

  private async prepareJob(jobId: string): Promise<{
    job: NonNullable<Awaited<ReturnType<PullJobsRepository['findById']>>>;
    entry: NonNullable<Awaited<ReturnType<CatalogRepository['findById']>>>;
    client: HuggingFaceClient;
    files: Awaited<ReturnType<HuggingFaceClient['listFiles']>>;
    modelDir: string;
  } | null> {
    const job = await this.jobsRepo.findById(jobId);
    if (!job) {
      this.logger.error(`run: job ${jobId} not found`);
      return null;
    }
    const entry = await this.catalogRepo.findById(job.modelId);
    if (!entry) {
      await this.markFailed(jobId, PullReasonCode.UNKNOWN, 'Catalog entry not found');
      return null;
    }
    await this.jobsRepo.updateStatus(jobId, PullJobStatus.RUNNING);
    await this.catalogRepo.updateDownloadStatus(entry.id, DownloadStatus.PULLING);
    this.emitProgress(job, PullJobStatus.RUNNING);
    const client = new HuggingFaceClient(
      AppConfig.get().HUGGINGFACE_API_BASE,
      AppConfig.get().HUGGINGFACE_TOKEN,
    );
    const pattern = this.compilePattern(entry.filePattern);
    const files = await client.listFiles(entry.huggingfaceRepo, pattern);
    if (files.length === 0) {
      await this.markFailed(jobId, PullReasonCode.HF_UNAVAILABLE, 'No matching files in HF repo');
      return null;
    }
    const dataPath = AppConfig.get().LLAMACPP_DATA_PATH;
    const modelDir = resolveSafePath(dataPath, path.join('models', entry.name, entry.tag));
    await fs.promises.mkdir(modelDir, { recursive: true });
    return { job, entry, client, files, modelDir };
  }

  private async downloadAllFiles(
    jobId: string,
    job: NonNullable<Awaited<ReturnType<PullJobsRepository['findById']>>>,
    entry: NonNullable<Awaited<ReturnType<CatalogRepository['findById']>>>,
    client: HuggingFaceClient,
    files: Awaited<ReturnType<HuggingFaceClient['listFiles']>>,
    modelDir: string,
    controller: AbortController,
  ): Promise<bigint | null> {
    let downloadedBytes = 0n;
    let completedFiles = 0;
    for (const file of files) {
      if (controller.signal.aborted) {
        await this.markCancelled(jobId);
        return null;
      }
      const target = resolveSafePath(modelDir, path.basename(file.name));
      const bytes = await this.downloadOneFile(
        client,
        entry.huggingfaceRepo,
        file.name,
        target,
        controller.signal,
      );
      downloadedBytes += bytes;
      if (file.sha256 && !(await this.verifyFileSha(target, file.sha256))) {
        await this.markFailed(jobId, PullReasonCode.SHA_MISMATCH, `SHA mismatch on ${file.name}`);
        return null;
      }
      completedFiles++;
      await this.jobsRepo.updateProgress(jobId, {
        downloadedBytes,
        completedFiles,
        currentFile: file.name,
      });
      this.emitProgress(
        { ...job, downloadedBytes, completedFiles, currentFile: file.name },
        PullJobStatus.RUNNING,
      );
      this.events.pullProgress({
        jobId,
        modelId: entry.id,
        downloadedBytes,
        totalBytes: job.totalBytes,
        completedFiles,
        totalFiles: files.length,
      });
    }
    return downloadedBytes;
  }

  private async downloadOneFile(
    client: HuggingFaceClient,
    repo: string,
    fileName: string,
    targetPath: string,
    signal: AbortSignal,
  ): Promise<bigint> {
    const url = client.buildDownloadUrl(repo, fileName);
    let attempt = 0;
    while (attempt < DOWNLOAD_RETRY_MAX) {
      try {
        return await this.downloadWithResume(client, url, targetPath, signal);
      } catch (error) {
        if ((error as Error).name === 'AbortError' || signal.aborted) {
          throw error;
        }
        attempt++;
        if (attempt >= DOWNLOAD_RETRY_MAX) {
          throw error;
        }
        const delay = DOWNLOAD_RETRY_BASE_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `downloadOneFile: retry ${attempt}/${DOWNLOAD_RETRY_MAX} after ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Download retries exhausted');
  }

  private async downloadWithResume(
    client: HuggingFaceClient,
    url: string,
    targetPath: string,
    signal: AbortSignal,
  ): Promise<bigint> {
    const partialPath = `${targetPath}.partial`;
    let resumeFrom = 0n;
    try {
      const stat = await fs.promises.stat(partialPath);
      resumeFrom = BigInt(stat.size);
    } catch {
      // no partial yet
    }

    const headers = client.buildHeaders(resumeFrom);
    const response = await request(url, {
      method: 'GET',
      headers,
      signal,
      maxRedirections: 5,
      bodyTimeout: 0,
    });
    if (response.statusCode >= 400 && response.statusCode !== 416) {
      throw new Error(`HTTP ${response.statusCode} downloading ${url}`);
    }

    const writer = fs.createWriteStream(partialPath, { flags: resumeFrom > 0n ? 'a' : 'w' });
    let total = resumeFrom;
    let lastDbWrite = Date.now();
    await new Promise<void>((resolve, reject) => {
      response.body.on('data', (chunk: Buffer) => {
        total += BigInt(chunk.length);
        if (Date.now() - lastDbWrite > PROGRESS_DB_THROTTLE_MS) {
          lastDbWrite = Date.now();
        }
      });
      response.body.pipe(writer);
      writer.on('finish', () => resolve());
      writer.on('error', reject);
      response.body.on('error', reject);
      signal.addEventListener('abort', () => reject(new Error('AbortError')));
    });

    await fs.promises.rename(partialPath, targetPath);
    return total;
  }

  private async verifyFileSha(filePath: string, expected: string): Promise<boolean> {
    try {
      const actual = await computeSha256(filePath);
      return actual.toLowerCase() === expected.toLowerCase();
    } catch (error) {
      this.logger.error(`verifyFileSha: ${filePath} — ${(error as Error).message}`);
      return false;
    }
  }

  private async markCompleted(jobId: string, modelId: string, totalBytes: bigint): Promise<void> {
    await this.jobsRepo.updateStatus(jobId, PullJobStatus.COMPLETED, {
      reasonCode: PullReasonCode.OK,
      completedAt: new Date(),
    });
    await this.catalogRepo.updateDownloadStatus(modelId, DownloadStatus.READY);
    const job = await this.jobsRepo.findById(jobId);
    if (job) {
      this.emitProgress({ ...job, downloadedBytes: totalBytes }, PullJobStatus.COMPLETED);
    }
    this.events.pullCompleted({ jobId, modelId, totalBytes });
  }

  private async markFailed(jobId: string, reason: PullReasonCode, message: string): Promise<void> {
    await this.jobsRepo.updateStatus(jobId, PullJobStatus.FAILED, {
      reasonCode: reason,
      errorMessage: message,
      completedAt: new Date(),
    });
    const job = await this.jobsRepo.findById(jobId);
    if (job) {
      const event = await this.catalogRepo.findById(job.modelId);
      if (event) {
        await this.catalogRepo.updateDownloadStatus(event.id, DownloadStatus.ERROR);
      }
      this.emitProgress(
        { ...job, reasonCode: reason, errorMessage: message },
        PullJobStatus.FAILED,
      );
      this.events.pullFailed({
        jobId,
        modelId: job.modelId,
        reasonCode: reason,
        errorMessage: message,
      });
    }
  }

  private async markCancelled(jobId: string): Promise<void> {
    await this.jobsRepo.updateStatus(jobId, PullJobStatus.CANCELLED, {
      reasonCode: PullReasonCode.USER_CANCELLED,
      completedAt: new Date(),
    });
    const job = await this.jobsRepo.findById(jobId);
    if (job) {
      this.emitProgress(
        { ...job, reasonCode: PullReasonCode.USER_CANCELLED },
        PullJobStatus.CANCELLED,
      );
    }
  }

  private compilePattern(filePattern: string): RegExp {
    const escaped = filePattern
      .replaceAll(/[.+^${}()|[\]\\]/g, '\\$&')
      .replaceAll('*', '.*')
      .replaceAll('?', '.');
    return new RegExp(escaped, 'i');
  }

  private emitProgress(job: PullJob, status: PullJobStatus): void {
    this.progressEmitter.emit({
      jobId: job.id,
      status,
      bytesDownloaded: job.downloadedBytes,
      totalBytes: job.totalBytes,
      completedFiles: job.completedFiles,
      totalFiles: job.totalFiles,
      currentFile: job.currentFile,
      mbps: 0,
      etaSeconds: null,
      reasonCode: job.reasonCode,
      errorMessage: job.errorMessage,
    });
  }
}
