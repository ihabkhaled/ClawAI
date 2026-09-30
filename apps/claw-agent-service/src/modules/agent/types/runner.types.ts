import type { Prisma } from '../../../generated/prisma';
import type { RUNNER_SELECT } from '../constants/runner.constants';
import type { RunnerApprovalPolicy } from '../../../common/enums/runner-approval-policy.enum';

export type RunnerRow = Prisma.AgentSessionGetPayload<{ select: typeof RUNNER_SELECT }>;

export type RunnerMetadata = {
  kind: string;
  name: string;
  labels: string[];
  approvalPolicy: RunnerApprovalPolicy;
};

export type RunnerView = {
  id: string;
  name: string;
  labels: string[];
  approvalPolicy: RunnerApprovalPolicy;
  hostname: string;
  platform: string;
  agentVersion: string;
  status: string;
  lastHeartbeatAt: Date | null;
};

/**
 * `runnerToken` is shown once. It is the runner's own credential for heartbeat,
 * claim and report; the session key is never returned for a runner.
 */
export type RegisterRunnerResult = {
  runnerId: string;
  runnerToken: string;
  tokenPrefix: string;
  approvalPolicy: RunnerApprovalPolicy;
  heartbeatIntervalSeconds: number;
};

export type IssuedRunnerToken = {
  token: string;
  tokenHash: string;
  tokenPrefix: string;
};

export type RotatedRunnerCredential = {
  runnerId: string;
  runnerToken: string;
  tokenPrefix: string;
};

/** The runner a credential authenticates, as the guard needs it. */
export type RunnerCredentialIdentity = {
  sessionId: string;
  userId: string;
};
