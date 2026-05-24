import { Injectable, Logger } from '@nestjs/common';
import { MemorySensitivity } from '../../../generated/prisma';
import {
  SENSITIVITY_PRE_FILTER_PATTERNS,
  SENSITIVITY_SOFT_HINTS,
} from '../../../common/constants/memory-sensitivity.constants';
import type { SensitivityVerdict } from '../types/memory-sensitivity.types';

export type { SensitivityVerdict };

@Injectable()
export class MemorySensitivityManager {
  private readonly logger = new Logger(MemorySensitivityManager.name);

  classify(content: string): SensitivityVerdict {
    this.logger.debug(`classify: contentLen=${String(content.length)}`);
    const trimmed = content.slice(0, 8192);
    for (const { name, pattern } of SENSITIVITY_PRE_FILTER_PATTERNS) {
      if (pattern.test(trimmed)) {
        const redacted = this.redact(trimmed, pattern);
        this.logger.warn(`classify: REDACTED — matched ${name}`);
        return {
          verdict: MemorySensitivity.REDACTED,
          confidence: 1,
          reason: name,
          redactedPreview: redacted,
        };
      }
    }
    const hits = SENSITIVITY_SOFT_HINTS.filter((hint) => trimmed.toLowerCase().includes(hint));
    if (hits.length > 0) {
      this.logger.debug(`classify: SENSITIVE — soft hints=${hits.join(',')}`);
      return {
        verdict: MemorySensitivity.SENSITIVE,
        confidence: Math.min(0.5 + 0.1 * hits.length, 0.9),
        reason: `Mentions: ${hits.slice(0, 5).join(', ')}`,
        redactedPreview: null,
      };
    }
    return {
      verdict: MemorySensitivity.NORMAL,
      confidence: 1,
      reason: null,
      redactedPreview: null,
    };
  }

  private redact(content: string, pattern: RegExp): string {
    const compact = content.replaceAll(pattern, (match) => {
      if (match.length <= 4) {
        return '*'.repeat(match.length);
      }
      return `${match.slice(0, 2)}${'*'.repeat(Math.max(match.length - 6, 4))}${match.slice(-4)}`;
    });
    return compact.slice(0, 256);
  }
}
