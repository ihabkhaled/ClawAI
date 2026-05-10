import { Module } from '@nestjs/common';
import { TaxonomyController } from './controllers/taxonomy.controller';
import { TaxonomyService } from './services/taxonomy.service';
import { TaxonomyRoleRepository } from './repositories/taxonomy-role.repository';

@Module({
  controllers: [TaxonomyController],
  providers: [TaxonomyService, TaxonomyRoleRepository],
  exports: [TaxonomyService, TaxonomyRoleRepository],
})
export class TaxonomyModule {}
