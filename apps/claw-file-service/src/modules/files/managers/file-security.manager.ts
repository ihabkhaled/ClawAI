import { Injectable, Logger } from '@nestjs/common';
import { scanBuffer } from '../../../common/utilities/clamav-scanner.utility';
import {
  detectZipBomb,
  sanitizeFilename,
  validateFilename,
  validateMagicBytes,
} from '../../../common/utilities/file-validator.utility';
import type { FileSecurityCheck, FileSecurityCheckResult } from '../types/file-security.types';

@Injectable()
export class FileSecurityManager {
  private readonly logger = new Logger(FileSecurityManager.name);

  async runAllChecks(
    filename: string,
    mimeType: string,
    buffer: Buffer,
  ): Promise<FileSecurityCheckResult> {
    this.logger.log(
      `runAllChecks: scanning "${filename}" (${mimeType}, ${String(buffer.length)} bytes)`,
    );

    const checks: FileSecurityCheck[] = [];

    const filenameCheck = validateFilename(filename);
    checks.push({
      name: 'filename_validation',
      passed: filenameCheck.valid,
      reason: filenameCheck.reason,
    });

    const magicCheck = validateMagicBytes(buffer, mimeType);
    checks.push({ name: 'magic_bytes', passed: magicCheck.valid, reason: magicCheck.reason });

    const bombCheck = detectZipBomb(buffer);
    checks.push({ name: 'zip_bomb_detection', passed: bombCheck.valid, reason: bombCheck.reason });

    const scanResult = await scanBuffer(buffer);
    checks.push({ name: 'antivirus_scan', passed: scanResult.clean, reason: scanResult.reason });

    const allPassed = checks.every((c) => c.passed);

    if (!allPassed) {
      const failed = checks.filter((c) => !c.passed);
      this.logger.warn(
        `runAllChecks: REJECTED "${filename}" — ${failed.map((f) => `${f.name}: ${f.reason}`).join(', ')}`,
      );
    } else {
      this.logger.debug(
        `runAllChecks: "${filename}" passed all ${String(checks.length)} security checks`,
      );
    }

    return { passed: allPassed, checks };
  }

  getSanitizedFilename(filename: string): string {
    return sanitizeFilename(filename);
  }
}
