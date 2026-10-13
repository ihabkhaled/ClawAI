import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';
import { RequirePermissions } from '@claw/shared-entitlements';
import {
  type AuthenticatedUser,
  Permission,
  type PluginCredentialStatus,
  type PluginInstallView,
  type PluginMentionView,
  type PluginToolConsentView,
} from '@claw/shared-types';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { INSTALL_ID_PIPE, TOOL_NAME_PIPE } from '../constants/install-pipes.constants';
import { INSTALLS_CACHE_CONTROL } from '../constants/installs.constants';
import {
  type ConsentBody,
  consentBodySchema,
  type CredentialBody,
  credentialBodySchema,
  type InstallBody,
  installBodySchema,
  type UpdateInstallBody,
  updateInstallBodySchema,
} from '../dto/install.dto';
import { PluginConsentsService } from '../services/plugin-consents.service';
import { PluginCredentialsService } from '../services/plugin-credentials.service';
import { PluginInstallsService } from '../services/plugin-installs.service';

@Controller('plugins/installs')
export class PluginInstallsController {
  constructor(
    private readonly installs: PluginInstallsService,
    private readonly credentials: PluginCredentialsService,
    private readonly consents: PluginConsentsService,
  ) {}

  @Get()
  @RequirePermissions(Permission.PLUGINS_USE)
  @Header('Cache-Control', INSTALLS_CACHE_CONTROL)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): Promise<PluginInstallView[]> {
    return this.installs.list(user.id, acceptLanguage);
  }

  // Declared before ":id" so "mentions" is never read as an install id.
  @Get('mentions')
  @RequirePermissions(Permission.PLUGINS_USE)
  @Header('Cache-Control', INSTALLS_CACHE_CONTROL)
  mentions(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): Promise<PluginMentionView[]> {
    return this.installs.mentions(user.id, acceptLanguage);
  }

  @Get(':id')
  @RequirePermissions(Permission.PLUGINS_USE)
  @Header('Cache-Control', INSTALLS_CACHE_CONTROL)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', INSTALL_ID_PIPE) id: string,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): Promise<PluginInstallView> {
    return this.installs.get(user.id, id, acceptLanguage);
  }

  @Post()
  @RequirePermissions(Permission.PLUGINS_INSTALL)
  install(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(installBodySchema)) body: InstallBody,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): Promise<PluginInstallView> {
    return this.installs.install(user.id, body, acceptLanguage);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PLUGINS_INSTALL)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', INSTALL_ID_PIPE) id: string,
    @Body(new ZodValidationPipe(updateInstallBodySchema)) body: UpdateInstallBody,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): Promise<PluginInstallView> {
    return this.installs.update(user.id, id, body, acceptLanguage);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(Permission.PLUGINS_INSTALL)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', INSTALL_ID_PIPE) id: string,
  ): Promise<void> {
    return this.installs.remove(user.id, id);
  }

  @Put(':id/credential')
  @RequirePermissions(Permission.PLUGINS_INSTALL)
  @Header('Cache-Control', INSTALLS_CACHE_CONTROL)
  putCredential(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', INSTALL_ID_PIPE) id: string,
    @Body(new ZodValidationPipe(credentialBodySchema)) body: CredentialBody,
  ): Promise<PluginCredentialStatus> {
    return this.credentials.put(user.id, id, body);
  }

  @Delete(':id/credential')
  @HttpCode(204)
  @RequirePermissions(Permission.PLUGINS_INSTALL)
  removeCredential(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', INSTALL_ID_PIPE) id: string,
  ): Promise<void> {
    return this.credentials.remove(user.id, id);
  }

  @Post(':id/consent')
  @HttpCode(200)
  @RequirePermissions(Permission.PLUGINS_INSTALL)
  grantConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', INSTALL_ID_PIPE) id: string,
    @Body(new ZodValidationPipe(consentBodySchema)) body: ConsentBody,
  ): Promise<PluginToolConsentView> {
    return this.consents.grant(user.id, id, body);
  }

  @Delete(':id/consent/:toolName')
  @HttpCode(204)
  @RequirePermissions(Permission.PLUGINS_INSTALL)
  revokeConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', INSTALL_ID_PIPE) id: string,
    @Param('toolName', TOOL_NAME_PIPE) toolName: string,
  ): Promise<void> {
    return this.consents.revoke(user.id, id, toolName);
  }
}
