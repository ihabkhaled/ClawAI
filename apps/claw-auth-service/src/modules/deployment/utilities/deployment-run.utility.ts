import {
  DeploymentRunConclusion,
  type DeploymentRunJob,
  DeploymentRunLane,
  type DeploymentRunPointer,
  DeploymentRunStatus,
  type DeploymentRunView,
} from '@claw/shared-types';

import {
  GITHUB_COMMIT_TITLE_MAX_LENGTH,
  GITHUB_RELEASE_DEPLOY_JOB_PREFIX,
} from '../constants/deployment-trigger.constants';
import { type GithubJob, type GithubRun, type GithubRunCandidate } from '../types/github-run.types';

export function toDeploymentRunJob(job: GithubJob): DeploymentRunJob {
  return {
    id: job.id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    url: job.html_url,
    startedAt: job.started_at ?? null,
    completedAt: job.completed_at ?? null,
    steps: (job.steps ?? []).map((step) => ({
      number: step.number,
      name: step.name,
      status: step.status,
      conclusion: step.conclusion,
      startedAt: step.started_at ?? null,
      completedAt: step.completed_at ?? null,
    })),
  };
}

/**
 * The step running right now. GitHub reports one in-progress step per running
 * job, so the first match is the answer an operator wants on screen.
 */
export function findCurrentStep(jobs: DeploymentRunJob[]): DeploymentRunPointer | null {
  for (const job of jobs) {
    const step = job.steps.find(
      (candidate) => candidate.status === DeploymentRunStatus.IN_PROGRESS,
    );
    if (step) return { jobName: job.name, stepName: step.name, jobUrl: job.url };
  }
  return null;
}

/**
 * The FIRST failed step, not the last. Later steps often fail as a consequence
 * of the first one, so the first failure is the one whose log explains the
 * rollout.
 */
export function findFailedStep(jobs: DeploymentRunJob[]): DeploymentRunPointer | null {
  for (const job of jobs) {
    const step = job.steps.find(
      (candidate) =>
        candidate.conclusion === DeploymentRunConclusion.FAILURE ||
        candidate.conclusion === DeploymentRunConclusion.TIMED_OUT,
    );
    if (step) return { jobName: job.name, stepName: step.name, jobUrl: job.url };
  }
  return null;
}

/** A run that has not finished yet — the one an operator is waiting on. */
export function isActiveRun(run: GithubRun): boolean {
  return run.status !== DeploymentRunStatus.COMPLETED;
}

function runTime(run: GithubRun): number {
  const stamp = run.created_at ?? run.run_started_at ?? run.updated_at;
  return stamp ? Date.parse(stamp) : 0;
}

/**
 * Orders both lanes' runs the way the progress panel should consider them: a
 * queued or running rollout first, then the newest by creation time. A run
 * GitHub skipped outright never deployed anything and is dropped.
 */
export function rankRunCandidates(candidates: GithubRunCandidate[]): GithubRunCandidate[] {
  return candidates
    .filter((candidate) => candidate.run.conclusion !== DeploymentRunConclusion.SKIPPED)
    .sort((left, right) => {
      const activeOrder = Number(isActiveRun(right.run)) - Number(isActiveRun(left.run));
      if (activeOrder !== 0) return activeOrder;
      const timeOrder = runTime(right.run) - runTime(left.run);
      return timeOrder === 0 ? right.run.id - left.run.id : timeOrder;
    });
}

/**
 * The jobs worth showing for a run, or null when the run did not deploy.
 *
 * A manual run IS the deploy workflow, so every job is a deploy job. A release
 * run also bumps the version and publishes notes; only its reusable-workflow
 * deploy jobs are the rollout. While a release run is still preparing and its
 * deploy job does not exist yet, all its jobs are shown so the panel is not
 * blank. A finished release run whose deploy job was skipped is not a rollout.
 */
export function selectDeployJobs(
  candidate: GithubRunCandidate,
  jobs: GithubJob[],
): GithubJob[] | null {
  if (candidate.lane === DeploymentRunLane.MANUAL) return jobs;
  const deployJobs = jobs.filter(
    (job) =>
      job.name.startsWith(GITHUB_RELEASE_DEPLOY_JOB_PREFIX) &&
      job.conclusion !== DeploymentRunConclusion.SKIPPED,
  );
  if (deployJobs.length > 0) return deployJobs;
  return isActiveRun(candidate.run) ? jobs : null;
}

/** First line of the triggering commit's message, bounded for display. */
export function commitTitle(run: GithubRun): string | null {
  const firstLine = run.head_commit?.message.split('\n')[0]?.trim() ?? '';
  return firstLine.length === 0 ? null : firstLine.slice(0, GITHUB_COMMIT_TITLE_MAX_LENGTH);
}

export function toDeploymentRunView(
  candidate: GithubRunCandidate,
  jobs: DeploymentRunJob[],
): DeploymentRunView {
  const { run, lane } = candidate;
  return {
    id: run.id,
    runNumber: run.run_number,
    status: run.status,
    conclusion: run.conclusion,
    url: run.html_url,
    headSha: run.head_sha,
    commitTitle: commitTitle(run),
    triggerSource: lane,
    startedAt: run.run_started_at ?? null,
    updatedAt: run.updated_at ?? null,
    jobs,
    currentStep: findCurrentStep(jobs),
    failedStep: findFailedStep(jobs),
  };
}
