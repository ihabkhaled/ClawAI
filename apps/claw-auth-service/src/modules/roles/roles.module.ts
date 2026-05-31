import { Module } from '@nestjs/common';
import { RolesController } from './controllers/roles.controller';
import { RolesService } from './services/roles.service';
import { RolesRepository } from './repositories/roles.repository';
import { PermissionsSeederService } from './services/permissions-seeder.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, RolesRepository, PermissionsSeederService],
  exports: [RolesService, RolesRepository, PermissionsSeederService],
})
export class RolesModule {}
