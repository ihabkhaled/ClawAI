// SCAFFOLD: stream R.5 (06-r5-operator-playground)
// NEW module — NOT yet registered.

import { Module } from '@nestjs/common';

import { PlaygroundController } from './controllers/playground.controller';
import { PlaygroundService } from './services/playground.service';

@Module({
  controllers: [PlaygroundController],
  providers: [PlaygroundService],
  exports: [PlaygroundService],
})
export class PlaygroundModule {}
