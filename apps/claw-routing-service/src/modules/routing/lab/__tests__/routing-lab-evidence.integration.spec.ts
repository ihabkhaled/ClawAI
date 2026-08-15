import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { RouterErrorCode } from '../../../../common/enums';
import { RoutingLabRunnerManager } from '../managers/routing-lab-runner.manager';
import { buildRoutingLabCorpus } from '../utilities/routing-lab-corpus.utility';
import { computeRoutingLabManifestData } from '../utilities/routing-lab-breakdown.utility';
import { renderRoutingLabManifest } from '../utilities/routing-lab-manifest.utility';

/**
 * Runs the full 300-case corpus once through a real `CloudRouterManager` and
 * writes the resulting manifest to disk — this test IS Batch 12's evidence
 * generator, not merely a check that one exists. Re-running the suite
 * regenerates the artifact from the current harness, so it never goes stale
 * the way a hand-pasted evidence doc would.
 */
// __tests__ -> lab -> routing -> modules -> src -> claw-routing-service (5 hops)
const EVIDENCE_FILE_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'evidence',
  'BATCH-12-ROUTING-LAB-MANIFEST.md',
);

describe('routing lab evidence generation (full 300-case corpus)', () => {
  it('runs the corpus, produces a well-formed manifest, and writes it to disk', async () => {
    const corpus = buildRoutingLabCorpus();
    expect(corpus).toHaveLength(300);

    const runner = new RoutingLabRunnerManager();
    const runResult = await runner.runCorpus(corpus);

    expect(runResult.totalCases).toBe(300);
    expect(runResult.outcomes).toHaveLength(300);

    const manifestData = computeRoutingLabManifestData(runResult);

    // Every attempt count must be non-negative and every declined case must
    // carry an explanation of some kind — a silent gap here would mean the
    // manifest under-reports what actually happened.
    for (const outcome of runResult.outcomes) {
      expect(outcome.attemptCount).toBeGreaterThanOrEqual(0);
      if (!outcome.passed) {
        expect(outcome.unavailableReason !== null || outcome.finalErrorCode !== null).toBe(true);
      }
    }

    // The 15 fault-single cases alone guarantee every RouterErrorCode is
    // recorded at least once, since the coordinator records a failed
    // attempt's code before ever deciding whether to retry or advance.
    expect(manifestData.errorTaxonomy.distinctCodesObserved).toBe(
      Object.values(RouterErrorCode).length,
    );
    expect(
      manifestData.passDecline.passed +
        manifestData.passDecline.declinedUnavailable +
        manifestData.passDecline.declinedChainExhausted,
    ).toBe(300);

    const markdown = renderRoutingLabManifest(manifestData);
    expect(markdown).toContain('# Batch 12');
    expect(markdown).toContain('Corpus size: 300 cases');
    expect(markdown).toContain('## 4. Error-taxonomy distribution');

    mkdirSync(dirname(EVIDENCE_FILE_PATH), { recursive: true });
    writeFileSync(EVIDENCE_FILE_PATH, markdown, 'utf8');
  });
});
