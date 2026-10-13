import { NotFoundException } from '@nestjs/common';

import { PluginErrorCode } from '../../../common/enums/plugin-error-code.enum';

/** The 404 every install-scoped route answers when the install is missing, gone or not the caller's. */
export function installNotFound(): NotFoundException {
  return new NotFoundException({
    message: 'Install not found',
    errorCode: PluginErrorCode.INSTALL_NOT_FOUND,
  });
}
