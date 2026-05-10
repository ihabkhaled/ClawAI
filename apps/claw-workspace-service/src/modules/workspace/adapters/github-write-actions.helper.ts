import { Injectable } from '@nestjs/common';

import {
  CLAW_USER_AGENT,
  GITHUB_API_BASE,
  WRITE_EXECUTION_TIMEOUT_MS,
} from '../../../common/constants/workspace.constants';
import type { WriteActionResult } from '../types/workspace.types';

@Injectable()
export class GitHubWriteActionsHelper {
  private buildHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': CLAW_USER_AGENT,
    };
  }

  async execute(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const handlers = this.handlerMap();
    const handler = handlers.get(actionType);
    if (handler === undefined) {
      return {
        success: false,
        errorMessage: `GitHub adapter: unsupported action type ${actionType}`,
      };
    }
    return handler(accessToken, payload);
  }

  private handlerMap(): Map<
    string,
    (accessToken: string, payload: Record<string, unknown>) => Promise<WriteActionResult>
  > {
    const map = new Map<
      string,
      (accessToken: string, payload: Record<string, unknown>) => Promise<WriteActionResult>
    >();
    map.set('CREATE_ISSUE', (a, p) => this.createIssue(a, p));
    map.set('CREATE_ISSUE_COMMENT', (a, p) => this.createIssueComment(a, p));
    map.set('CREATE_PR_DESCRIPTION', (a, p) => this.updatePrDescription(a, p));
    map.set('COMMENT_PR', (a, p) => this.commentPr(a, p));
    map.set('APPROVE_PR', (a, p) => this.approvePr(a, p));
    map.set('ADD_PR_SUGGESTION', (a, p) => this.addPrSuggestion(a, p));
    return map;
  }

  private async createIssue(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const owner = payload['owner'] as string;
    const repo = payload['repo'] as string;
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: this.buildHeaders(accessToken),
      signal: AbortSignal.timeout(WRITE_EXECUTION_TIMEOUT_MS),
      body: JSON.stringify({
        title: payload['title'],
        body: payload['body'],
        labels: payload['labels'] ?? [],
      }),
    });
    if (!response.ok) {
      return { success: false, errorMessage: `GitHub API error: HTTP ${response.status}` };
    }
    const issue = (await response.json()) as { number: number; html_url: string };
    return { success: true, externalId: String(issue.number), url: issue.html_url };
  }

  private async createIssueComment(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const owner = payload['owner'] as string;
    const repo = payload['repo'] as string;
    const issueNumber = payload['issueNumber'] as number;
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: this.buildHeaders(accessToken),
        signal: AbortSignal.timeout(WRITE_EXECUTION_TIMEOUT_MS),
        body: JSON.stringify({ body: payload['body'] }),
      },
    );
    if (!response.ok) {
      return { success: false, errorMessage: `GitHub API error: HTTP ${response.status}` };
    }
    const comment = (await response.json()) as { id: number; html_url: string };
    return { success: true, externalId: String(comment.id), url: comment.html_url };
  }

  private async updatePrDescription(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const owner = payload['owner'] as string;
    const repo = payload['repo'] as string;
    const pullNumber = payload['pullNumber'] as number;
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}`, {
      method: 'PATCH',
      headers: this.buildHeaders(accessToken),
      signal: AbortSignal.timeout(WRITE_EXECUTION_TIMEOUT_MS),
      body: JSON.stringify({ body: payload['body'] }),
    });
    if (!response.ok) {
      return { success: false, errorMessage: `GitHub API error: HTTP ${response.status}` };
    }
    const pr = (await response.json()) as { number: number; html_url: string };
    return { success: true, externalId: String(pr.number), url: pr.html_url };
  }

  private async commentPr(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const owner = payload['owner'] as string;
    const repo = payload['repo'] as string;
    const pullNumber = payload['pullNumber'] as number;
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
      {
        method: 'POST',
        headers: this.buildHeaders(accessToken),
        signal: AbortSignal.timeout(WRITE_EXECUTION_TIMEOUT_MS),
        body: JSON.stringify({ body: payload['body'] }),
      },
    );
    if (!response.ok) {
      return { success: false, errorMessage: `GitHub API error: HTTP ${response.status}` };
    }
    const comment = (await response.json()) as { id: number; html_url: string };
    return { success: true, externalId: String(comment.id), url: comment.html_url };
  }

  private async approvePr(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const owner = payload['owner'] as string;
    const repo = payload['repo'] as string;
    const pullNumber = payload['pullNumber'] as number;
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
      {
        method: 'POST',
        headers: this.buildHeaders(accessToken),
        signal: AbortSignal.timeout(WRITE_EXECUTION_TIMEOUT_MS),
        body: JSON.stringify({
          event: 'APPROVE',
          body:
            typeof payload['body'] === 'string'
              ? payload['body']
              : 'Approved via ClawAI multi-judge quorum',
        }),
      },
    );
    if (!response.ok) {
      return { success: false, errorMessage: `GitHub API error: HTTP ${response.status}` };
    }
    const review = (await response.json()) as { id: number; html_url: string };
    return { success: true, externalId: String(review.id), url: review.html_url };
  }

  private async addPrSuggestion(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const owner = payload['owner'] as string;
    const repo = payload['repo'] as string;
    const pullNumber = payload['pullNumber'] as number;
    const commitId = payload['commitId'] as string;
    const path = payload['path'] as string;
    const line = payload['line'] as number;
    const suggestion = payload['suggestion'] as string;
    const body = `\`\`\`suggestion\n${suggestion}\n\`\`\``;
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}/comments`,
      {
        method: 'POST',
        headers: this.buildHeaders(accessToken),
        signal: AbortSignal.timeout(WRITE_EXECUTION_TIMEOUT_MS),
        body: JSON.stringify({
          commit_id: commitId,
          path,
          line,
          body,
          side: 'RIGHT',
        }),
      },
    );
    if (!response.ok) {
      return { success: false, errorMessage: `GitHub API error: HTTP ${response.status}` };
    }
    const comment = (await response.json()) as { id: number; html_url: string };
    return { success: true, externalId: String(comment.id), url: comment.html_url };
  }
}
