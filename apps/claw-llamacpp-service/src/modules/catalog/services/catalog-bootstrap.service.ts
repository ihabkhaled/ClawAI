import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { FRONTIER_CATALOG_ENTRIES } from '../constants/frontier-catalog-entries.constants';

@Injectable()
export class CatalogBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.debug('onApplicationBootstrap: ensuring frontier catalog seeded');
    try {
      await this.seed();
    } catch (error) {
      this.logger.error(`onApplicationBootstrap: catalog seed failed — ${(error as Error).message}`);
    }
  }

  private async seed(): Promise<void> {
    let upserted = 0;
    for (const entry of FRONTIER_CATALOG_ENTRIES) {
      await this.prisma.frontierCatalogEntry.upsert({
        where: { name_tag: { name: entry.name, tag: entry.tag } },
        create: { ...entry },
        update: { ...entry },
      });
      upserted += 1;
    }
    this.logger.log(`seed: upserted ${upserted} frontier catalog entries`);
  }
}
