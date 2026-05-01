export type SandboxStatus = 'OK' | 'BLOCKED' | 'TIMEOUT' | 'ERROR';

export type StaticAnalysisFindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export type StaticAnalysisFinding = {
  stepId: string;
  severity: StaticAnalysisFindingSeverity;
  code: string;
  message: string;
};

export type SandboxResult = {
  status: SandboxStatus;
  durationMs: number;
  staticFindings: StaticAnalysisFinding[];
  runtimeFindings: StaticAnalysisFinding[];
  error?: string;
};
