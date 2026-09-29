import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { AppConfig } from '../../../app/config/app.config';
import { PrismaClient } from '../../../generated/prisma';
import { PRISMA_GLOBAL_OMIT } from './constants/prisma-omit.constants';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: AppConfig.get().IMAGE_DATABASE_URL }),
      omit: PRISMA_GLOBAL_OMIT,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
