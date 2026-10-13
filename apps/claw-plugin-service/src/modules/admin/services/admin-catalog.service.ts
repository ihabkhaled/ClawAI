import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type PluginAdminCatalogEntryView } from '@claw/shared-types';

import { PluginErrorCode } from '../../../common/enums/plugin-error-code.enum';
import { type UpdateAdminCatalogBody } from '../dto/admin.dto';
import { AdminCatalogPresenterManager } from '../managers/admin-catalog-presenter.manager';
import { AdminCatalogRepository } from '../repositories/admin-catalog.repository';
import { type AdminCatalogRecord } from '../types/admin.types';

@Injectable()
export class AdminCatalogService {
  private readonly logger = new Logger(AdminCatalogService.name);

  constructor(
    private readonly repository: AdminCatalogRepository,
    private readonly presenter: AdminCatalogPresenterManager,
  ) {}

  async list(): Promise<PluginAdminCatalogEntryView[]> {
    const records = await this.repository.findAll();
    return records.map((record) => this.presenter.toView(record));
  }

  async get(slug: string): Promise<PluginAdminCatalogEntryView> {
    return this.presenter.toView(await this.require(slug));
  }

  /** Kill switch, featured flag and per-tool disables. Installs of a switched-off plugin read UNAVAILABLE. */
  async update(
    adminId: string,
    slug: string,
    body: UpdateAdminCatalogBody,
  ): Promise<PluginAdminCatalogEntryView> {
    const record = await this.require(slug);
    const tools = body.tools ?? [];
    this.assertToolsExist(record, tools);
    await this.repository.applyChanges(
      record.id,
      record.currentVersion?.id ?? null,
      {
        ...(body.globallyEnabled === undefined ? {} : { globallyEnabled: body.globallyEnabled }),
        ...(body.featured === undefined ? {} : { featured: body.featured }),
      },
      tools,
    );
    this.logger.log(
      `update: admin=${adminId} plugin=${slug} globallyEnabled=${String(body.globallyEnabled)} featured=${String(body.featured)} toolChanges=${String(tools.length)}`,
    );
    return this.get(slug);
  }

  private async require(slug: string): Promise<AdminCatalogRecord> {
    const record = await this.repository.findBySlug(slug);
    if (record === null) {
      throw new NotFoundException({
        message: 'Plugin not found',
        errorCode: PluginErrorCode.NOT_FOUND,
      });
    }
    return record;
  }

  private assertToolsExist(record: AdminCatalogRecord, tools: Array<{ name: string }>): void {
    const known = new Set(record.currentVersion?.tools.map((tool) => tool.name) ?? []);
    if (tools.some((tool) => !known.has(tool.name))) {
      throw new NotFoundException({
        message: 'Tool not found in this plugin',
        errorCode: PluginErrorCode.TOOL_NOT_FOUND,
      });
    }
  }
}
