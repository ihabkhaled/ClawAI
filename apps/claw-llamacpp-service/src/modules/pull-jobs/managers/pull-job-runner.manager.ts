import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { Agent, interceptors, request } from 'undici';
import { computeSha256, HuggingFaceClient, resolveSafePath } from '../../../common/utilities';
import { AppConfig } from '../../../app/config/app.config';
import { DownloadStatus, PullJobPhase, PullJobStatus, PullReasonCode } from '../../../common/enums';
import { LlamacppEventsPublisher } from '../../../common/events/llamacpp-events.publisher';
import { CatalogRepository } from '../../catalog/repositories/catalog.repository';
import { PullJobsRepository } from '../repositories/pull-jobs.repository';
import { PullJobProgressEmitterManager } from './pull-job-progress-emitter.manager';
import {
  DOWNLOAD_RETRY_BASE_MS,
  DOWNLOAD_RETRY_MAX,
  DOWNLOAD_RETRY_MAX_BACKOFF_MS,
  INSTALL_RETRY_BASE_MS,
  INSTALL_RETRY_MAX,
  PROGRESS_DB_THROTTLE_MS,
  PROGRESS_SSE_THROTTLE_MS,
} from '../constants/pull-job.constants';
import { type PullJob } from '../types/pull-job.types';
import { type DownloadStatsState } from '../types/download-stats.types';
import { createStatsState, tickStats } from '../utilities/download-stats.utility';

@Injectable()
export class PullJobRunnerManager {
  private readonly logger = new Logger(PullJobRunnerManager.name);
  private readonly cancellations = new Map<string, AbortController>();
  private readonly activeJobs = new Set<string>();

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

  isRunning(jobId: string): boolean {
    return this.activeJobs.has(jobId);
  }

  async run(jobId: string, isResume = false): Promise<void> {
    if (this.activeJobs.has(jobId)) {
      this.logger.warn(`run: ${jobId} already in flight; skipping duplicate start`);
      return;
    }
    this.logger.log(`run: starting job ${jobId}${isResume ? ' (resume)' : ''}`);
    this.activeJobs.add(jobId);
    const controller = new AbortController();
    this.cancellations.set(jobId, controller);
    try {
      if (isResume) {
        await this.jobsRepo.markResumed(jobId);
      }
      const prepared = await this.prepareJob(jobId);
      if (prepared === null) return;
      const downloadedBytes = await this.downloadAllFiles(jobId, prepared, controller);
      if (downloadedBytes === null) return;
      await this.runInstallPhase(jobId, prepared.entry.id, downloadedBytes);
    } catch (error) {
      this.logger.error(`run: ${jobId} failed — ${(error as Error).message}`);
      await this.markFailed(jobId, PullReasonCode.UNKNOWN, (error as Error).message);
    } finally {
      this.cancellations.delete(jobId);
      this.activeJobs.delete(jobId);
    }
  }

  private async prepareJob(jobId: string): Promise<{
    job: PullJob;
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
    await this.jobsRepo.updateStatus(jobId, PullJobStatus.RUNNING, {
      phase: PullJobPhase.DOWNLOADING,
    });
    await this.catalogRepo.updateDownloadStatus(entry.id, DownloadStatus.PULLING);
    this.emitProgress(
      { ...job, status: PullJobStatus.RUNNING, phase: PullJobPhase.DOWNLOADING },
      0,
      null,
      0,
    );
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
    prepared: {
      job: PullJob;
      entry: NonNullable<Awaited<ReturnType<CatalogRepository['findById']>>>;
      client: HuggingFaceClient;
      files: Awaited<ReturnType<HuggingFaceClient['listFiles']>>;
      modelDir: string;
    },
    controller: AbortController,
  ): Promise<bigint | null> {
    const { job, entry, client, files, modelDir } = prepared;
    let downloadedBytes = job.downloadedBytes;
    let completedFiles = job.completedFiles;
    const stats = createStatsState(downloadedBytes, job.startedAt);

    const remainingFiles = files.slice(completedFiles);
    for (const file of remainingFiles) {
      if (controller.signal.aborted) {
        await this.markCancelled(jobId);
        return null;
      }
      if (!file) {
        continue;
      }
      const target = resolveSafePath(modelDir, path.basename(file.name));
      const bytes = await this.downloadOneFile(
        jobId,
        client,
        entry.huggingfaceRepo,
        file.name,
        target,
        controller.signal,
        downloadedBytes,
        job.totalBytes,
        stats,
        job,
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
      this.emitProgressForRunningJob(jobId, job, downloadedBytes, completedFiles, file.name, stats);
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
    jobId: string,
    client: HuggingFaceClient,
    repo: string,
    fileName: string,
    targetPath: string,
    signal: AbortSignal,
    downloadedSoFar: bigint,
    totalBytes: bigint,
    stats: DownloadStatsState,
    job: PullJob,
  ): Promise<bigint> {
    const url = client.buildDownloadUrl(repo, fileName);
    let attempt = 0;
    while (attempt < DOWNLOAD_RETRY_MAX) {
      try {
        return await this.downloadWithResume(
          jobId,
          client,
          url,
          targetPath,
          signal,
          downloadedSoFar,
          totalBytes,
          fileName,
          stats,
          job,
        );
      } catch (error) {
        if ((error as Error).name === 'AbortError' || signal.aborted) {
          throw error;
        }
        attempt++;
        await this.jobsRepo.incrementRetryAttempts(jobId);
        if (attempt >= DOWNLOAD_RETRY_MAX) {
          throw error;
        }
        const delay = Math.min(
          DOWNLOAD_RETRY_BASE_MS * Math.pow(2, attempt - 1),
          DOWNLOAD_RETRY_MAX_BACKOFF_MS,
        );
        this.logger.warn(
          `downloadOneFile: ${jobId} ${fileName} retry ${attempt}/${DOWNLOAD_RETRY_MAX} after ${delay}ms — ${(error as Error).message}`,
        );
        await this.delay(delay, signal);
      }
    }
    throw new Error('Download retries exhausted');
  }

  private async downloadWithResume(
    jobId: string,
    client: HuggingFaceClient,
    url: string,
    targetPath: string,
    signal: AbortSignal,
    downloadedBefore: bigint,
    _totalBytes: bigint,
    fileName: string,
    stats: DownloadStatsState,
    job: PullJob,
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
    const dispatcher = new Agent({ bodyTimeout: 0, headersTimeout: 30_000 }).compose(
      interceptors.redirect({ maxRedirections: 5 }),
    );
    const response = await request(url, {
      method: 'GET',
      headers,
      signal,
      dispatcher,
    });
    if (response.statusCode >= 400 && response.statusCode !== 416) {
      throw new Error(`HTTP ${response.statusCode} downloading ${url}`);
    }

    const writer = fs.createWriteStream(partialPath, { flags: resumeFrom > 0n ? 'a' : 'w' });
    let total = resumeFrom;
    let lastDbWrite = Date.now();
    let lastSseEmit = Date.now();
    await new Promise<void>((resolve, reject) => {
      response.body.on('data', (chunk: Buffer) => {
        total += BigInt(chunk.length);
        const now = Date.now();
        if (now - lastDbWrite > PROGRESS_DB_THROTTLE_MS) {
          lastDbWrite = now;
          const currentTotal = downloadedBefore + total - resumeFrom;
          void this.jobsRepo
            .updateProgress(jobId, {
              downloadedBytes: currentTotal,
              completedFiles: job.completedFiles,
              currentFile: fileName,
            })
            .catch((err) => {
              this.logger.warn(`progress write failed: ${(err as Error).message}`);
            });
        }
        if (now - lastSseEmit > PROGRESS_SSE_THROTTLE_MS) {
          lastSseEmit = now;
          const currentTotal = downloadedBefore + total - resumeFrom;
          this.emitProgressForRunningJob(
            jobId,
            job,
            currentTotal,
            job.completedFiles,
            fileName,
            stats,
          );
        }
      });
      response.body.pipe(writer);
      writer.on('finish', () => resolve());
      writer.on('error', reject);
      response.body.on('error', reject);
      signal.addEventListener('abort', () => reject(new Error('AbortError')));
    });

    await fs.promises.rename(partialPath, targetPath);
    return total - resumeFrom;
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

  private async runInstallPhase(
    jobId: string,
    modelId: string,
    totalBytes: bigint,
  ): Promise<void> {
    this.logger.log(`runInstallPhase: ${jobId} — entering INSTALLING`);
    await this.jobsRepo.updateStatus(jobId, PullJobStatus.INSTALLING, {
      phase: PullJobPhase.INSTALLING,
    });
    const job = await this.jobsRepo.findById(jobId);
    if (job) {
      this.emitInstallProgress(job, 'verifying');
    }

    let attempt = 0;
    while (attempt < INSTALL_RETRY_MAX) {
      try {
        await this.executeInstallSteps(jobId);
        await this.markCompleted(jobId, modelId, totalBytes);
        return;
      } catch (error) {
        attempt++;
        await this.jobsRepo.incrementInstallAttempts(jobId);
        if (attempt >= INSTALL_RETRY_MAX) {
          throw error;
        }
        const delay = INSTALL_RETRY_BASE_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `runInstallPhase: ${jobId} install retry ${attempt}/${INSTALL_RETRY_MAX} after ${delay}ms — ${(error as Error).message}`,
        );
        await this.delay(delay);
      }
    }
  }

  private async executeInstallSteps(jobId: string): Promise<void> {
    // Llamacpp install steps: file moves already done in downloadWithResume rename.
    // Remaining: register the model in the runtime config + flip the catalog status.
    // Each step updates installStep so the FE can show a step indicator.
    await this.jobsRepo.updatePhase(jobId, PullJobPhase.INSTALLING, 'verifying-files');
    const job = await this.jobsRepo.findById(jobId);
    if (!job) {
      throw new Error('Job vanished during install');
    }
    this.emitInstallProgress(job, 'verifying-files');

    await this.jobsRepo.updatePhase(jobId, PullJobPhase.FINALIZING, 'registering-model');
    this.emitInstallProgress({ ...job, phase: PullJobPhase.FINALIZING }, 'registering-model');
  }

  private async markCompleted(jobId: string, modelId: string, totalBytes: bigint): Promise<void> {
    await this.jobsRepo.updateStatus(jobId, PullJobStatus.COMPLETED, {
      phase: PullJobPhase.DONE,
      reasonCode: PullReasonCode.OK,
      completedAt: new Date(),
    });
    await this.catalogRepo.updateDownloadStatus(modelId, DownloadStatus.READY);
    const job = await this.jobsRepo.findById(jobId);
    if (job) {
      this.emitTerminal(
        { ...job, downloadedBytes: totalBytes },
        PullJobStatus.COMPLETED,
        PullJobPhase.DONE,
      );
    }
    this.events.pullCompleted({ jobId, modelId, totalBytes });
  }

  private async markFailed(jobId: string, reason: PullReasonCode, message: string): Promise<void> {
    await this.jobsRepo.updateStatus(jobId, PullJobStatus.FAILED, {
      phase: PullJobPhase.DONE,
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
      this.emitTerminal(
        { ...job, reasonCode: reason, errorMessage: message },
        PullJobStatus.FAILED,
        PullJobPhase.DONE,
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
      phase: PullJobPhase.DONE,
      reasonCode: PullReasonCode.USER_CANCELLED,
      completedAt: new Date(),
    });
    const job = await this.jobsRepo.findById(jobId);
    if (job) {
      this.emitTerminal(
        { ...job, reasonCode: PullReasonCode.USER_CANCELLED },
        PullJobStatus.CANCELLED,
        PullJobPhase.DONE,
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

  private emitProgressForRunningJob(
    jobId: string,
    job: PullJob,
    downloadedBytes: bigint,
    completedFiles: number,
    currentFile: string,
    stats: DownloadStatsState,
  ): void {
    const snap = tickStats(stats, downloadedBytes, job.totalBytes, job.startedAt.getTime());
    this.progressEmitter.emit({
      jobId,
      status: PullJobStatus.RUNNING,
      phase: PullJobPhase.DOWNLOADING,
      bytesDownloaded: downloadedBytes,
      totalBytes: job.totalBytes,
      completedFiles,
      totalFiles: job.totalFiles,
      currentFile,
      installStep: null,
      installAttempts: job.installAttempts,
      retryAttempts: job.retryAttempts,
      mbps: snap.mbps,
      speedBytesPerSec: snap.speedBytesPerSec,
      etaSeconds: snap.etaSeconds,
      elapsedMs: snap.elapsedMs,
      reasonCode: null,
      errorMessage: null,
    });
  }

  private emitProgress(
    job: PullJob,
    downloadedBytes: bigint | number,
    currentFile: string | null,
    completedFiles: number,
  ): void {
    const bytes = typeof downloadedBytes === 'bigint' ? downloadedBytes : BigInt(downloadedBytes);
    const elapsedMs = Date.now() - job.startedAt.getTime();
    this.progressEmitter.emit({
      jobId: job.id,
      status: job.status,
      phase: job.phase,
      bytesDownloaded: bytes,
      totalBytes: job.totalBytes,
      completedFiles,
      totalFiles: job.totalFiles,
      currentFile,
      installStep: job.installStep,
      installAttempts: job.installAttempts,
      retryAttempts: job.retryAttempts,
      mbps: 0,
      speedBytesPerSec: 0,
      etaSeconds: null,
      elapsedMs,
      reasonCode: job.reasonCode,
      errorMessage: job.errorMessage,
    });
  }

  private emitInstallProgress(job: PullJob, step: string): void {
    const elapsedMs = Date.now() - job.startedAt.getTime();
    this.progressEmitter.emit({
      jobId: job.id,
      status: PullJobStatus.INSTALLING,
      phase: job.phase === PullJobPhase.FINALIZING ? PullJobPhase.FINALIZING : PullJobPhase.INSTALLING,
      bytesDownloaded: job.downloadedBytes,
      totalBytes: job.totalBytes,
      completedFiles: job.completedFiles,
      totalFiles: job.totalFiles,
      currentFile: job.currentFile,
      installStep: step,
      installAttempts: job.installAttempts,
      retryAttempts: job.retryAttempts,
      mbps: 0,
      speedBytesPerSec: 0,
      etaSeconds: null,
      elapsedMs,
      reasonCode: null,
      errorMessage: null,
    });
  }

  private emitTerminal(job: PullJob, status: PullJobStatus, phase: PullJobPhase): void {
    const elapsedMs = Date.now() - job.startedAt.getTime();
    this.progressEmitter.emit({
      jobId: job.id,
      status,
      phase,
      bytesDownloaded: job.downloadedBytes,
      totalBytes: job.totalBytes,
      completedFiles: job.completedFiles,
      totalFiles: job.totalFiles,
      currentFile: job.currentFile,
      installStep: job.installStep,
      installAttempts: job.installAttempts,
      retryAttempts: job.retryAttempts,
      mbps: 0,
      speedBytesPerSec: 0,
      etaSeconds: null,
      elapsedMs,
      reasonCode: job.reasonCode,
      errorMessage: job.errorMessage,
    });
  }

  private async delay(ms: number, signal?: AbortSignal): Promise<void> {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}
