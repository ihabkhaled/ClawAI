import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { RecipesModule } from '../recipes/recipes.module';
import { MarketplaceController } from './controllers/marketplace.controller';
import { MarketplaceRepository } from './repositories/marketplace.repository';
import { MarketplaceService } from './services/marketplace.service';

/**
 * Stream 42 — Recipe marketplace.
 *
 * v1: Ed25519-signed listings + verification on publish + install. The
 * signature defends against tampering at the DB layer (a malicious
 * sysadmin can't swap a listing's DSL without invalidating the
 * signature).
 *
 * v2 (deferred): sandbox subprocess runner that loads each listing in a
 * resource-limited child process before execution. The runner enforces
 * cpu/memory caps + denied syscalls so adversarial recipes can't escape
 * even if their signature is valid (e.g., a publisher whose private key
 * was leaked).
 */
@Module({
  imports: [PrismaModule, RecipesModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceRepository, MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
