// SCAFFOLD: stream R.5 (06-r5-operator-playground)

import { Body, Controller, Post } from '@nestjs/common';

import { PlaygroundService } from '../services/playground.service';

@Controller('routing/playground')
export class PlaygroundController {
  constructor(private readonly service: PlaygroundService) {}

  @Post('evaluate')
  async evaluate(@Body() body: unknown): Promise<unknown> {
    return this.service.evaluate(body);
  }
}
