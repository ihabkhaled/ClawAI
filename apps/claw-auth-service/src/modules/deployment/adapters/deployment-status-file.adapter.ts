import { Injectable } from '@nestjs/common';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  type DeploymentAutomationDocument,
  type DeploymentStatusDocument,
} from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import {
  parseDeploymentAutomation,
  parseDeploymentStatus,
} from '../utilities/deployment-status.utility';

/**
 * Owns the `.deploy` state files scripts/deploy-prod.sh writes during a rollout.
 *
 * Reads tolerate every failure — a missing file simply means production has not
 * deployed through this box yet. Writes do not: an operator who clears a stuck
 * rollout or pauses the automatic lane has to know whether it took, so a write
 * failure propagates. Every write lands through a temp file plus rename so a
 * concurrent read never observes a half-written document — the same discipline
 * deploy-prod.sh uses for status.json.
 */
@Injectable()
export class DeploymentStatusFileAdapter {
  async read(): Promise<DeploymentStatusDocument | null> {
    return this.readJson(AppConfig.get().DEPLOYMENT_STATUS_FILE, parseDeploymentStatus);
  }

  async write(document: DeploymentStatusDocument): Promise<void> {
    await this.writeJson(AppConfig.get().DEPLOYMENT_STATUS_FILE, document);
  }

  async readAutomation(): Promise<DeploymentAutomationDocument | null> {
    return this.readJson(AppConfig.get().DEPLOYMENT_AUTOMATION_FILE, parseDeploymentAutomation);
  }

  async writeAutomation(document: DeploymentAutomationDocument): Promise<void> {
    await this.writeJson(AppConfig.get().DEPLOYMENT_AUTOMATION_FILE, document);
  }

  private async readJson<TDocument>(
    path: string,
    parse: (value: unknown) => TDocument | null,
  ): Promise<TDocument | null> {
    try {
      return parse(JSON.parse(await readFile(path, 'utf8')));
    } catch {
      return null;
    }
  }

  private async writeJson(path: string, document: unknown): Promise<void> {
    const temporaryPath = `${path}.tmp`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(temporaryPath, `${JSON.stringify(document)}\n`, 'utf8');
    await rename(temporaryPath, path);
  }
}
