import { Module } from '@nestjs/common';

import { PlanCatalogClient } from './plan-catalog.client';

@Module({
  providers: [PlanCatalogClient],
  exports: [PlanCatalogClient],
})
export class PlanCatalogModule {}
