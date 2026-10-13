import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type PluginInstallLimitDetail,
  type PluginInstallView,
  type PluginMentionView,
} from '@claw/shared-types';

import { InstallState } from '../../../common/enums/install-state.enum';
import { InstallStatus } from '../../../common/enums/install-status.enum';
import { PluginErrorCode } from '../../../common/enums/plugin-error-code.enum';
import { CatalogStatus } from '../../../common/enums/catalog-status.enum';
import { type PluginManifest } from '../../catalog/schemas/plugin-manifest.schema';
import { parsePluginManifest } from '../../catalog/utilities/parse-plugin-manifest.utility';
import { resolveLocale } from '../../catalog/utilities/resolve-locale.utility';
import { type InstallBody, type UpdateInstallBody } from '../dto/install.dto';
import { InstallPlanGateManager } from '../managers/install-plan-gate.manager';
import { InstallPresenterManager } from '../managers/install-presenter.manager';
import { InstallSettingsManager } from '../managers/install-settings.manager';
import { InstallsRepository } from '../repositories/installs.repository';
import {
  type InstallEntryRecord,
  type InstallRecord,
  type InstallVersionRecord,
} from '../types/install.types';
import { installNotFound } from '../utilities/install-not-found.utility';

@Injectable()
export class PluginInstallsService {
  private readonly logger = new Logger(PluginInstallsService.name);

  constructor(
    private readonly repository: InstallsRepository,
    private readonly planGate: InstallPlanGateManager,
    private readonly settings: InstallSettingsManager,
    private readonly presenter: InstallPresenterManager,
  ) {}

  async install(
    userId: string,
    body: InstallBody,
    acceptLanguage: string | undefined,
  ): Promise<PluginInstallView> {
    const entry = await this.requireInstallable(body.slug);
    const version = this.pickVersion(entry, body.version);
    const settings = this.settings.resolve(this.manifestOf(version, body.slug), body.settings);
    const cap = await this.planGate.resolveInstallCap(userId);
    const outcome = await this.repository.createWithinCap(
      { userId, pluginId: entry.id, versionId: version.id, settings },
      cap,
    );
    if (outcome.kind === 'DUPLICATE') {
      throw new ConflictException({
        message: 'This plugin is already installed',
        errorCode: PluginErrorCode.ALREADY_INSTALLED,
      });
    }
    if (outcome.kind === 'LIMIT') throw this.limitError(cap ?? 0, outcome.current);
    this.logger.log(`install: plugin=${body.slug} install=${outcome.installId}`);
    return this.view(await this.requireOwned(outcome.installId, userId), acceptLanguage);
  }

  async list(userId: string, acceptLanguage: string | undefined): Promise<PluginInstallView[]> {
    const records = await this.repository.findAllOwned(userId);
    const locale = resolveLocale(undefined, acceptLanguage);
    return records.map((record) => this.presenter.toView(record, locale));
  }

  async mentions(userId: string, acceptLanguage: string | undefined): Promise<PluginMentionView[]> {
    const records = await this.repository.findAllOwned(userId);
    const locale = resolveLocale(undefined, acceptLanguage);
    return records.map((record) => this.presenter.toMention(record, locale));
  }

  async get(
    userId: string,
    id: string,
    acceptLanguage: string | undefined,
  ): Promise<PluginInstallView> {
    return this.view(await this.requireOwned(id, userId), acceptLanguage);
  }

  async update(
    userId: string,
    id: string,
    body: UpdateInstallBody,
    acceptLanguage: string | undefined,
  ): Promise<PluginInstallView> {
    const current = await this.requireOwned(id, userId);
    if (body.enabled === true && this.presenter.stateOf(current) === InstallState.UNAVAILABLE) {
      throw this.unavailable();
    }
    const settings =
      body.settings === undefined
        ? undefined
        : this.settings.resolve(
            this.manifestOf(current.version, current.plugin.slug),
            body.settings,
          );
    const updated = await this.repository.update(id, userId, {
      ...(body.enabled === undefined
        ? {}
        : { status: body.enabled ? InstallStatus.ENABLED : InstallStatus.DISABLED }),
      ...(settings === undefined ? {} : { settings }),
    });
    return this.view(this.orNotFound(updated), acceptLanguage);
  }

  async remove(userId: string, id: string): Promise<void> {
    const removed = await this.repository.remove(id, userId);
    if (!removed) throw installNotFound();
    this.logger.log(`remove: install=${id}`);
  }

  /** The owner's install, or 404 for a missing id and for another user's id alike. */
  async requireOwned(id: string, userId: string): Promise<InstallRecord> {
    return this.orNotFound(await this.repository.findOwned(id, userId));
  }

  private view(record: InstallRecord, acceptLanguage: string | undefined): PluginInstallView {
    return this.presenter.toView(record, resolveLocale(undefined, acceptLanguage));
  }

  private orNotFound(record: InstallRecord | null): InstallRecord {
    if (record === null) throw installNotFound();
    return record;
  }

  private async requireInstallable(slug: string): Promise<InstallEntryRecord> {
    const entry = await this.repository.findEntryForInstall(slug);
    if (entry === null) {
      throw new NotFoundException({
        message: 'Plugin not found',
        errorCode: PluginErrorCode.NOT_FOUND,
      });
    }
    const available =
      entry.status === CatalogStatus.PUBLISHED &&
      entry.globallyEnabled &&
      entry.currentVersionId !== null;
    if (!available) throw this.unavailable();
    return entry;
  }

  private pickVersion(
    entry: InstallEntryRecord,
    requested: string | undefined,
  ): InstallVersionRecord {
    const version = entry.versions.find((candidate) =>
      requested === undefined
        ? candidate.id === entry.currentVersionId
        : candidate.version === requested,
    );
    if (version === undefined) {
      throw new NotFoundException({
        message: 'Plugin version not found',
        errorCode: PluginErrorCode.VERSION_NOT_FOUND,
      });
    }
    return version;
  }

  private manifestOf(version: InstallVersionRecord, slug: string): PluginManifest {
    const parsed = parsePluginManifest(version.manifest);
    if (!parsed.ok) {
      this.logger.error(`manifestOf: manifest of ${slug} is invalid`);
      throw this.unavailable();
    }
    return parsed.manifest;
  }

  private limitError(limit: number, current: number): ForbiddenException {
    const detail: PluginInstallLimitDetail = { limit, current };
    return new ForbiddenException({
      message: 'Your plan has reached its plugin limit',
      errorCode: PluginErrorCode.INSTALL_LIMIT,
      ...detail,
    });
  }

  private unavailable(): ConflictException {
    return new ConflictException({
      message: 'This plugin is not available right now',
      errorCode: PluginErrorCode.UNAVAILABLE,
    });
  }
}
