import { Controller, Get, Param, Query } from "@nestjs/common";
import { AuditLog } from "@prisma/client";
import { AuditsService } from "../services/audits.service";
import { Roles } from "../../../app/decorators/roles.decorator";
import { UserRole } from "../../../common/enums";
import { PaginatedResult } from "../../../common/types";

@Controller("audits")
@Roles(UserRole.ADMIN)
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<PaginatedResult<AuditLog>> {
    return this.auditsService.findAll(
      page ? Number.parseInt(page, 10) : undefined,
      limit ? Number.parseInt(limit, 10) : undefined,
    );
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<AuditLog> {
    return this.auditsService.findById(id);
  }
}
