import { Injectable, Logger } from '@nestjs/common';

import { GITLAB_DEFAULT_API_BASE } from '../../../common/constants/workspace.constants';
import { WorkspaceActionType } from '../../../common/enums/workspace-action-type.enum';
import type { WriteActionResult } from '../types/workspace.types';

@Injectable()
export class GitLabWriteActionsHelper {
  private readonly logger = new Logger(GitLabWriteActionsHelper.name);

  async execute(
    accessToken: string,
    actionType: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const api = this.resolveApiBase(payload['baseUrl'] as string | undefined);
    try {
      switch (actionType) {
        case WorkspaceActionType.CREATE_MR_COMMENT:
          return await this.createMrComment(api, accessToken, payload);
        case WorkspaceActionType.APPROVE_MR:
          return await this.approveMr(api, accessToken, payload);
        case WorkspaceActionType.CREATE_GITLAB_ISSUE:
          return await this.createGitlabIssue(api, accessToken, payload);
        case WorkspaceActionType.COMMENT_GITLAB_ISSUE:
          return await this.commentGitlabIssue(api, accessToken, payload);
        case WorkspaceActionType.UPDATE_MR_DESCRIPTION:
          return await this.updateMrDescription(api, accessToken, payload);
        default:
          return {
            success: false,
            errorMessage: `Action ${actionType} not supported by GitLab adapter`,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`GitLab write ${actionType} failed: ${message}`);
      return { success: false, errorMessage: message };
    }
  }

  private resolveApiBase(baseUrl?: string): string {
    if (baseUrl === undefined || baseUrl.length === 0) {
      return GITLAB_DEFAULT_API_BASE;
    }
    const trimmed = baseUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api/v4') ? trimmed : `${trimmed}/api/v4`;
  }

  private async createMrComment(
    api: string,
    token: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const projectId = String(payload['projectId'] ?? '');
    const iid = String(payload['iid'] ?? '');
    const body = String(payload['body'] ?? '');
    const url = `${api}/projects/${encodeURIComponent(projectId)}/merge_requests/${encodeURIComponent(iid)}/notes`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ body }),
    });
    return this.toResult(response, ['id', 'web_url']);
  }

  private async approveMr(
    api: string,
    token: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const projectId = String(payload['projectId'] ?? '');
    const iid = String(payload['iid'] ?? '');
    const url = `${api}/projects/${encodeURIComponent(projectId)}/merge_requests/${encodeURIComponent(iid)}/approve`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    return this.toResult(response, ['id']);
  }

  private async createGitlabIssue(
    api: string,
    token: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const projectId = String(payload['projectId'] ?? '');
    const title = String(payload['title'] ?? '');
    const description = (payload['description'] as string | undefined) ?? '';
    const url = `${api}/projects/${encodeURIComponent(projectId)}/issues`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ title, description }),
    });
    return this.toResult(response, ['id', 'web_url']);
  }

  private async commentGitlabIssue(
    api: string,
    token: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const projectId = String(payload['projectId'] ?? '');
    const iid = String(payload['iid'] ?? '');
    const body = String(payload['body'] ?? '');
    const url = `${api}/projects/${encodeURIComponent(projectId)}/issues/${encodeURIComponent(iid)}/notes`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ body }),
    });
    return this.toResult(response, ['id']);
  }

  private async updateMrDescription(
    api: string,
    token: string,
    payload: Record<string, unknown>,
  ): Promise<WriteActionResult> {
    const projectId = String(payload['projectId'] ?? '');
    const iid = String(payload['iid'] ?? '');
    const description = String(payload['description'] ?? '');
    const url = `${api}/projects/${encodeURIComponent(projectId)}/merge_requests/${encodeURIComponent(iid)}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ description }),
    });
    return this.toResult(response, ['id', 'web_url']);
  }

  private async toResult(response: Response, idFields: string[]): Promise<WriteActionResult> {
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        success: false,
        errorMessage: `GitLab API ${String(response.status)} ${text.slice(0, 200)}`,
      };
    }
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const jsonEntries = Object.entries(json);
    const externalId = idFields
      .map((f) => jsonEntries.find(([k]) => k === f)?.[1])
      .find((v) => v !== undefined);
    const webUrl = jsonEntries.find(([k]) => k === 'web_url')?.[1];
    return {
      success: true,
      externalId: externalId === undefined ? undefined : String(externalId),
      url: typeof webUrl === 'string' ? webUrl : undefined,
    };
  }
}
