import { BadRequestException, Injectable } from '@nestjs/common';

import { PluginErrorCode } from '../../../common/enums/plugin-error-code.enum';
import { type PluginManifest } from '../../catalog/schemas/plugin-manifest.schema';
import { applySettingsDefaults, validateSettings } from '../utilities/validate-settings.utility';

@Injectable()
export class InstallSettingsManager {
  /** Defaults filled in, then checked against the manifest's settingsSchema; 400 names the paths, never the values. */
  resolve(
    manifest: PluginManifest,
    given: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    const merged = applySettingsDefaults(manifest.settingsSchema, given ?? {});
    const violations = validateSettings(manifest.settingsSchema, merged);
    if (violations.length > 0) {
      throw new BadRequestException({
        message: 'Settings are not valid for this plugin',
        errorCode: PluginErrorCode.SETTINGS_INVALID,
        errors: violations.map((violation) => ({
          field: violation.path || '<root>',
          message: violation.issue,
        })),
      });
    }
    return merged;
  }
}
