import type { FindingConfidence } from '../../../common/enums/finding-confidence.enum';

/**
 * One observation about a crawled site, distinct from an `EvidenceItem`:
 * evidence is a page handed to the model, a finding is a claim ABOUT the
 * crawled pages. `evidenceItemIds` ties a finding back to the specific
 * pages it was computed from, so it is checkable rather than asserted.
 */
export type AuditFinding = {
  category: string;
  claim: string;
  confidence: FindingConfidence;
  evidenceItemIds: string[];
  /** Stated caveats on what this finding does and does not prove. */
  limitations: string[];
};
