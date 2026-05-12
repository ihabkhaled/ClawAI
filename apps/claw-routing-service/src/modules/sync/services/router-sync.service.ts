import { Injectable } from '@nestjs/common';
import { RouterSyncManager } from '../managers/router-sync.manager';
import { type SyncRunResult } from '../types/sync.types';

@Injectable()
export class RouterSyncService {
  constructor(private readonly manager: RouterSyncManager) {}

  async triggerSync(): Promise<SyncRunResult> {
    return this.manager.syncAll();
  }
}
