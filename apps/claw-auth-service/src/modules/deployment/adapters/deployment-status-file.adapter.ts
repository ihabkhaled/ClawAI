import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';

import { type DeploymentStatusDocument } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { parseDeploymentStatus } from '../utilities/deployment-status.utility';

@Injectable()
export class DeploymentStatusFileAdapter {
  async read(): Promise<DeploymentStatusDocument | null> {
    try {
      const content = await readFile(AppConfig.get().DEPLOYMENT_STATUS_FILE, 'utf8');
      return parseDeploymentStatus(JSON.parse(content));
    } catch {
      return null;
    }
  }
}
