import { Injectable, Logger } from '@nestjs/common';
import { ClamScanOutcome } from '../../../common/enums/clam-scan-outcome.enum';
import { ClamavClient } from '../../../infrastructure/clamav/clamav.client';
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

  constructor(private readonly clamav: ClamavClient) {}

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

    const magicCheck = await validateMagicBytes(buffer, mimeType);
    checks.push({ name: 'magic_bytes', passed: magicCheck.valid, reason: magicCheck.reason });

    const bombCheck = detectZipBomb(buffer);
    checks.push({ name: 'zip_bomb_detection', passed: bombCheck.valid, reason: bombCheck.reason });

    const scanResult = await this.clamav.scan(buffer);
    checks.push({ name: 'antivirus_scan', passed: scanResult.clean, reason: scanResult.reason });

    const allPassed = checks.every((c) => c.passed);
    // Retryable only when the scanner being down is the SOLE failure: a file
    // that also failed a content check is rejected outright, as before.
    const antivirusUnavailable =
      scanResult.outcome === ClamScanOutcome.UNAVAILABLE &&
      checks.every((c) => c.passed || c.name === 'antivirus_scan');

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

    return { passed: allPassed, checks, antivirusUnavailable };
  }

  getSanitizedFilename(filename: string): string {
    return sanitizeFilename(filename);
  }
}
