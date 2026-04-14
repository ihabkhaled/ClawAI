import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceObjectLinkType } from '../../../common/enums/workspace-object-link-type.enum';
import {
  GITHUB_ISSUE_URL_PATTERN,
  GITHUB_PR_URL_PATTERN,
  JIRA_KEY_PATTERN,
  OBJECT_CONTENT_MAX_LENGTH,
  OBJECT_UPSERT_BATCH_SIZE,
  SLACK_CHANNEL_PATTERN,
} from '../../../common/constants/workspace.constants';
import { WorkspaceObjectRepository } from '../repositories/workspace-object.repository';
import type { Prisma, WorkspaceObject } from '../../../generated/prisma';
import type { SyncedObject } from '../types/workspace.types';

@Injectable()
export class WorkspaceObjectManager {
  private readonly logger = new Logger(WorkspaceObjectManager.name);

  constructor(private readonly repository: WorkspaceObjectRepository) {}

  async upsertBatch(
    connectorId: string,
    userId: string,
    provider: string,
    objects: SyncedObject[],
  ): Promise<number> {
    let synced = 0;
    for (let i = 0; i < objects.length; i += OBJECT_UPSERT_BATCH_SIZE) {
      const batch = objects.slice(i, i + OBJECT_UPSERT_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((obj) =>
          this.repository.upsert(connectorId, userId, provider, {
            connector: { connect: { id: connectorId } },
            userId,
            externalId: obj.externalId,
            type: obj.type,
            title: obj.title,
            content: this.truncateContent(obj.content),
            url: obj.url,
            authorId: obj.authorId,
            provider: provider as WorkspaceObject['provider'],
            metadata: (obj.metadata ?? {}) as Prisma.InputJsonValue,
            externalCreatedAt: obj.externalCreatedAt,
            externalUpdatedAt: obj.externalUpdatedAt,
          }),
        ),
      );
      for (const result of results) {
        if (result.status === 'fulfilled') {
          synced++;
        } else {
          this.logger.warn(`Object upsert failed: ${String(result.reason)}`);
        }
      }
    }
    this.logger.log(`Upserted ${synced}/${objects.length} objects for connector ${connectorId}`);
    return synced;
  }

  async detectAndCreateLinks(storedObjects: WorkspaceObject[]): Promise<void> {
    for (const obj of storedObjects) {
      if (obj.content === null || obj.content === undefined) {
        continue;
      }
      await this.extractLinksFromContent(obj.id, obj.content);
    }
  }

  private async extractLinksFromContent(objectId: string, content: string): Promise<void> {
    const jiraMatches = [...content.matchAll(JIRA_KEY_PATTERN)];
    for (const match of jiraMatches) {
      const ref = match[0];
      if (ref !== undefined) {
        await this.safeLinkCreate(objectId, ref, WorkspaceObjectLinkType.JIRA_REFERENCE, 0.9);
      }
    }

    const prMatches = [...content.matchAll(GITHUB_PR_URL_PATTERN)];
    for (const match of prMatches) {
      const ref = match[0];
      if (ref !== undefined) {
        await this.safeLinkCreate(objectId, ref, WorkspaceObjectLinkType.GITHUB_PR_REFERENCE, 0.95);
      }
    }

    const issueMatches = [...content.matchAll(GITHUB_ISSUE_URL_PATTERN)];
    for (const match of issueMatches) {
      const ref = match[0];
      if (ref !== undefined) {
        await this.safeLinkCreate(
          objectId,
          ref,
          WorkspaceObjectLinkType.GITHUB_ISSUE_REFERENCE,
          0.95,
        );
      }
    }

    const slackMatches = [...content.matchAll(SLACK_CHANNEL_PATTERN)];
    for (const match of slackMatches) {
      const ref = match[0];
      if (ref !== undefined) {
        await this.safeLinkCreate(objectId, ref, WorkspaceObjectLinkType.SLACK_MENTION, 0.85);
      }
    }
  }

  private async safeLinkCreate(
    objectId: string,
    ref: string,
    linkType: WorkspaceObjectLinkType,
    confidence: number,
  ): Promise<void> {
    try {
      await this.repository.createLink(objectId, ref, linkType, undefined, confidence);
    } catch {
      this.logger.warn(`Link creation skipped for ${objectId} → ${ref}`);
    }
  }

  private truncateContent(content: string | undefined): string | undefined {
    if (content === undefined) {
      return undefined;
    }
    return content.length > OBJECT_CONTENT_MAX_LENGTH
      ? content.slice(0, OBJECT_CONTENT_MAX_LENGTH)
      : content;
  }
}
