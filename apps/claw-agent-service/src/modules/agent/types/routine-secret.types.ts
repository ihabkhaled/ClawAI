import type { RoutineSecret } from '../../../generated/prisma';

/** What the owner sees of a secret: never the value, never the ciphertext. */
export type RoutineSecretMetadata = {
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RoutineSecretList = {
  secrets: RoutineSecretMetadata[];
  limit: number;
  webhookRunsReceiveSecrets: boolean;
};

export type RoutineSecretsPolicy = {
  webhookRunsReceiveSecrets: boolean;
};

/** One secret as handed to the runner at claim time. Exists only in memory and in that response. */
export type InjectedSecret = {
  name: string;
  value: string;
};

export type RoutineSecretWriteOutcome =
  { status: 'ok'; secret: RoutineSecretMetadata } | { status: 'exists' | 'limit' | 'missing' };

export type RoutineSecretRow = RoutineSecret;

export type SealedRoutineSecret = {
  routineId: string;
  userId: string;
  name: string;
  ciphertext: string;
};

/** The part of a job the secret layer reads. */
export type RoutineJob = {
  routineId: string | null;
  routineRunSource: string | null;
  userId: string;
};

/** A job's reported output, before and after secret values are scrubbed. */
export type RunOutput = {
  stdout?: string;
  stderr?: string;
};

/** A claimed job plus the secrets its routine grants it. `secrets` is empty for every other job. */
export type ClaimedJobSecrets = {
  secrets: InjectedSecret[];
};
