import { Module } from '@nestjs/common';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { QuotaService } from './services/quota.service';
import { TokenLedgerRepository } from './repositories/token-ledger.repository';

// QuotaService + ledger only. The internal quota HTTP controller lives in
// EntitlementsModule (it needs EntitlementsService to resolve a user's daily
// limit) — keeping the dependency one-directional avoids a circular import.
@Module({
  imports: [RedisModule],
  providers: [QuotaService, TokenLedgerRepository],
  exports: [QuotaService, TokenLedgerRepository],
})
export class QuotaModule {}
