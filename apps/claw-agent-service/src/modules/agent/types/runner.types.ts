import type { Prisma } from '../../../generated/prisma';
import type { RUNNER_SELECT } from '../constants/runner.constants';
import type { RunnerApprovalPolicy } from '../../../common/enums/runner-approval-policy.enum';
import type { RuntimeProtocolDescriptor } from './runtime-protocol.types';

export type RunnerRow = Prisma.AgentSessionGetPayload<{ select: typeof RUNNER_SELECT }>;

/** F100: the self-reported part of a heartbeat; either field may be absent. */
export type RunnerHeartbeatReport = {
  agentVersion?: string;
  platform?: string;
};

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
 * F095: what the server knows about a runner a session is being resumed on.
 * The runner's own tool list is not here: the server never sees it. A client
 * reconciles tools from the runtime-v2 manifest it sends with each run, and uses
 * this to check the runner is still up, what approval class it runs under and
 * which protocol versions the backend speaks.
 */
export type RunnerResumeManifest = {
  runner: RunnerView;
  /** Connected with a fresh heartbeat. A revoked, expired or stale runner is false. */
  online: boolean;
  protocol: RuntimeProtocolDescriptor;
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
