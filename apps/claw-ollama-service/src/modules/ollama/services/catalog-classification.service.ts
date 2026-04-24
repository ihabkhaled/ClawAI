import { Injectable, Logger } from '@nestjs/common';
import { ModelCatalogRepository } from '../repositories/model-catalog.repository';
import type { SearchBrowserReclassifySummary } from '../types/search-browser-reclassify.types';
import { classifySearchBrowser } from '../utilities/search-browser-classifier.utility';
import { SEARCH_BROWSER_ELIGIBILITY_THRESHOLD } from '../constants/search-browser-classifier.constants';

@Injectable()
export class CatalogClassificationService {
  private readonly logger = new Logger(CatalogClassificationService.name);

  constructor(private readonly catalogRepository: ModelCatalogRepository) {}

  async reclassifySearchBrowser(): Promise<SearchBrowserReclassifySummary> {
    const started = Date.now();
    const entries = await this.catalogRepository.findAllForClassification();
    let scored = 0;
    let changed = 0;
    let eligible = 0;

    for (const entry of entries) {
      const result = classifySearchBrowser({
        name: entry.name,
        displayName: entry.displayName,
        description: entry.description,
        parameterCount: entry.parameterCount,
        category: entry.category,
        capabilities: entry.capabilities,
        downloadStatus: entry.downloadStatus,
      });

      const prevScore = entry.searchBrowserScore;
      const prevReasons = [...entry.searchBrowserReasons].sort().join(',');
      const nextReasons = [...result.reasons].sort().join(',');
      const scoreChanged = prevScore !== result.score;
      const reasonsChanged = prevReasons !== nextReasons;

      if (scoreChanged || reasonsChanged) {
        await this.catalogRepository.updateSearchBrowserScore(
          entry.id,
          result.score,
          result.reasons,
        );
        changed += 1;
      }

      scored += 1;
      if (result.score >= SEARCH_BROWSER_ELIGIBILITY_THRESHOLD) {
        eligible += 1;
      }
    }

    const durationMs = Date.now() - started;
    this.logger.log(
      `reclassifySearchBrowser: processed=${entries.length} scored=${scored} changed=${changed} eligible=${eligible} durationMs=${durationMs}`,
    );

    return {
      processed: entries.length,
      scored,
      changed,
      eligible,
      durationMs,
    };
  }

  async reclassifySingle(entryId: string): Promise<void> {
    const entry = await this.catalogRepository.findById(entryId);
    if (entry === null) {
      return;
    }
    const result = classifySearchBrowser({
      name: entry.name,
      displayName: entry.displayName,
      description: entry.description,
      parameterCount: entry.parameterCount,
      category: entry.category,
      capabilities: entry.capabilities,
      downloadStatus: entry.downloadStatus,
    });
    await this.catalogRepository.updateSearchBrowserScore(entry.id, result.score, result.reasons);
  }
}
