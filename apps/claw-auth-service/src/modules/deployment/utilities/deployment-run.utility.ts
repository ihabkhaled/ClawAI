import {
  DeploymentRunConclusion,
  type DeploymentRunJob,
  type DeploymentRunPointer,
  DeploymentRunStatus,
  type DeploymentRunView,
} from '@claw/shared-types';
import { type GithubJob, type GithubRun } from '../types/github-run.types';

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

export function toDeploymentRunView(run: GithubRun, jobs: DeploymentRunJob[]): DeploymentRunView {
  return {
    id: run.id,
    runNumber: run.run_number,
    status: run.status,
    conclusion: run.conclusion,
    url: run.html_url,
    headSha: run.head_sha,
    // The workflow records the lane in the job name; reading it from there
    // avoids a second API call for a label.
    triggerSource: null,
    startedAt: run.run_started_at ?? null,
    updatedAt: run.updated_at ?? null,
    jobs,
    currentStep: findCurrentStep(jobs),
    failedStep: findFailedStep(jobs),
  };
}
