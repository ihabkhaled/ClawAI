import { Module } from '@nestjs/common';

import { ResearchClient } from './research.client';

@Module({ providers: [ResearchClient], exports: [ResearchClient] })
export class ResearchModule {}
