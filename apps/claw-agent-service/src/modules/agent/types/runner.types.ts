import type { Prisma } from '../../../generated/prisma';
import type { RUNNER_SELECT } from '../constants/runner.constants';

export type RunnerRow = Prisma.AgentSessionGetPayload<{ select: typeof RUNNER_SELECT }>;

export type RunnerMetadata = {
  kind: string;
  name: string;
  labels: string[];
};

export type RunnerView = {
  id: string;
  name: string;
  labels: string[];
  hostname: string;
  platform: string;
  agentVersion: string;
  status: string;
  lastHeartbeatAt: Date | null;
};

export type RegisterRunnerResult = {
  runnerId: string;
  sessionKey: string;
  heartbeatIntervalSeconds: number;
};
