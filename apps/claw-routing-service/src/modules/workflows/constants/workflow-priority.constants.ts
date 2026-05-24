// SCAFFOLD: stream R.3 (04-r3-workflow-orchestrator)
// When multiple workflow handlers match, this ordering decides the winner.

import { WorkflowKind } from '../../../generated/prisma';

export const WORKFLOW_PRIORITY: WorkflowKind[] = [
  WorkflowKind.JUDGE_PIPELINE,
  WorkflowKind.COMPARE_ENSEMBLE,
  WorkflowKind.PDF_EXTRACTION,
  WorkflowKind.YOUTUBE_TRANSCRIPT,
  WorkflowKind.VIDEO_ANALYSIS,
  WorkflowKind.AUDIO_TRANSCRIBE,
  WorkflowKind.IMAGE_ANALYSIS,
  WorkflowKind.CODE_REVIEW,
  WorkflowKind.SEARCH_FIRST,
  WorkflowKind.EXTRACT_FIRST,
  WorkflowKind.FILE_GENERATION,
  WorkflowKind.IMAGE_GENERATION,
  WorkflowKind.DIRECT_LLM,
];

export const WORKFLOW_FALLBACK_REASON_DISABLED = 'workflow_disabled_fallthrough';
export const WORKFLOW_FALLBACK_REASON_DEP_UNHEALTHY = 'workflow_dependency_unhealthy';
export const WORKFLOW_FALLBACK_REASON_EXTRACTION_FAILED = 'workflow_extraction_failed';
export const WORKFLOW_FALLBACK_REASON_NO_MATCH = 'workflow_no_match_using_direct_llm';
