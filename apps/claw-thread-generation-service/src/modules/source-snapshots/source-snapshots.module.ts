import { Module } from '@nestjs/common';

import { ChatSnapshotClient } from './chat-snapshot.client';

@Module({ providers: [ChatSnapshotClient], exports: [ChatSnapshotClient] })
export class SourceSnapshotsModule {}
