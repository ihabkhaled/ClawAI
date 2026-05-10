import * as crypto from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { HuggingFaceClient } from '../../../common/utilities';
import { AppConfig } from '../../../app/config/app.config';
import { CatalogRepository } from '../repositories/catalog.repository';
import { type CatalogEntry } from '../types/catalog.types';

@Injectable()
export class CatalogRefreshManager {
  private readonly logger = new Logger(CatalogRefreshManager.name);

  constructor(private readonly repo: CatalogRepository) {}

  async refreshAll(entries: CatalogEntry[]): Promise<{ refreshed: number; failed: number }> {
    this.logger.log(`refreshAll: refreshing ${entries.length} entries`);
    const client = new HuggingFaceClient(
      AppConfig.get().HUGGINGFACE_API_BASE,
      AppConfig.get().HUGGINGFACE_TOKEN,
    );
    let refreshed = 0;
    let failed = 0;
    const concurrency = 5;
    for (let i = 0; i < entries.length; i += concurrency) {
      const batch = entries.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map((entry) => this.refreshEntry(client, entry)),
      );
      for (const result of results) {
        if (result.status === 'fulfilled') {
          refreshed++;
        } else {
          failed++;
        }
      }
    }
    this.logger.log(`refreshAll: refreshed=${refreshed} failed=${failed}`);
    return { refreshed, failed };
  }

  private async refreshEntry(client: HuggingFaceClient, entry: CatalogEntry): Promise<void> {
    try {
      const pattern = this.compilePattern(entry.filePattern);
      const files = await client.listFiles(entry.huggingfaceRepo, pattern);
      if (files.length === 0) {
        this.logger.warn(`refreshEntry: ${entry.name}:${entry.tag} no files matched pattern`);
        await this.repo.updateMetadata(entry.id, { available: false });
        return;
      }
      const totalBytes = files.reduce((acc, file) => acc + BigInt(file.size), 0n);
      const manifest = files
        .map((file) => `${file.name}:${file.sha256 ?? file.oid ?? ''}`)
        .sort()
        .join('|');
      const manifestSha256 = crypto.createHash('sha256').update(manifest).digest('hex');
      await this.repo.updateMetadata(entry.id, {
        fileSizeBytes: totalBytes,
        manifestSha256,
        available: true,
      });
      this.logger.log(
        `refreshEntry: ${entry.name}:${entry.tag} bytes=${totalBytes} files=${files.length}`,
      );
    } catch (error) {
      this.logger.error(
        `refreshEntry: ${entry.name}:${entry.tag} failed — ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private compilePattern(filePattern: string): RegExp {
    const escaped = filePattern
      .replaceAll(/[.+^${}()|[\]\\]/g, '\\$&')
      .replaceAll('*', '.*')
      .replaceAll('?', '.');
    return new RegExp(escaped, 'i');
  }
}
