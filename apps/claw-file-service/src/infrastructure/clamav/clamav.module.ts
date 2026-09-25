import { Global, Module } from '@nestjs/common';
import { ClamavClient } from './clamav.client';

/**
 * Global so the upload pipeline (FileSecurityManager) and the health probe
 * share ONE client — and so one fail-fast window, not one per module.
 */
@Global()
@Module({
  providers: [ClamavClient],
  exports: [ClamavClient],
})
export class ClamavModule {}
