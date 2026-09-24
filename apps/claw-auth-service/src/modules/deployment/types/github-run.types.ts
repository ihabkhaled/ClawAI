import { type DeploymentRunLane } from '@claw/shared-types';
import { type z } from 'zod';

import { type githubJobSchema, type githubRunSchema } from '../schemas/github-run.schema';

/** A validated GitHub Actions job, exactly as the schema accepts it. */
export type GithubJob = z.infer<typeof githubJobSchema>;

/** A validated GitHub Actions workflow run. */
export type GithubRun = z.infer<typeof githubRunSchema>;

/** A run read from one of the two deployment lanes, tagged with that lane. */
export type GithubRunCandidate = {
  run: GithubRun;
  lane: DeploymentRunLane;
};
