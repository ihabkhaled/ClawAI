import { type ConsensusConfidenceLevel } from '../../../common/enums/consensus-confidence.enum';

export type { ConsensusConfidenceLevel };

export type ConsensusModelBreakdown = {
  provider: string;
  model: string;
  contentLength: number;
  status: 'completed' | 'failed' | 'timeout';
};

export type ConsensusAnalysis = {
  agreementScore: number;
  agreements: string[];
  disagreements: string[];
  contradictions: string[];
  confidenceLevel: ConsensusConfidenceLevel;
  synthesisRationale: string;
};

export type ConsensusSynthesisResult = {
  finalAnswer: string;
  analysis: ConsensusAnalysis;
  modelBreakdown: ConsensusModelBreakdown[];
};

export type ConsensusResponse = {
  messageId: string;
  threadId: string;
  prompt: string;
};

export type OllamaGenerateRequest = {
  model: string;
  prompt: string;
  stream: boolean;
  think?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
};

export type OllamaGenerateResponse = {
  response: string;
  thinking?: string;
  done: boolean;
};
