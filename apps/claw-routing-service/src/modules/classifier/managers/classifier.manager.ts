import { Injectable, Logger } from '@nestjs/common';
import { RiskLevel } from '../../../common/enums';
import { DomainTag, PrivacyClass } from '../../../generated/prisma';
import {
  CRITICAL_RISK_REGEX,
  DOMAIN_KEYWORDS,
  LOW_CONFIDENCE_FLOOR,
  PRIVATE_MARKER_REGEX,
  RISK_TIER_TO_LEVEL,
} from '../constants/domain-keywords.constants';
import {
  type ClassificationResult,
  type ClassifyInput,
  type DomainScore,
} from '../types/classification.types';
import { scoreMessageByDomain } from '../utilities/domain-scorer.utility';
import { detectModalities } from '../utilities/modality-detector.utility';

@Injectable()
export class ClassifierManager {
  private readonly logger = new Logger(ClassifierManager.name);

  classify(input: ClassifyInput): ClassificationResult {
    this.logger.debug(`classify length=${input.messageContent.length}`);
    const messageLower = input.messageContent.toLowerCase();
    const scores = scoreMessageByDomain(messageLower);
    const modality = detectModalities(input.messageContent, input.attachedFileMimeTypes);

    const top = scores[0];
    const second = scores[1];

    const { domain, secondaryDomain, confidence } = this.resolveDomain(top, second);
    const domainEntry = DOMAIN_KEYWORDS.find((entry) => entry.domain === domain);
    const baseRisk: RiskLevel =
      domainEntry === undefined
        ? RiskLevel.LOW
        : (RISK_TIER_TO_LEVEL[domainEntry.riskTier] as RiskLevel);
    const riskLevel = this.escalateForCriticalSignals(input.messageContent, baseRisk);

    const privacyClass = this.derivePrivacyClass(
      input.messageContent,
      domainEntry?.privacyDefault ?? PrivacyClass.CLOUD_PERMITTED,
    );

    const reasonTags: string[] = [];
    if (top !== undefined) {
      reasonTags.push(`domain_keywords:${top.matchedKeywords.slice(0, 5).join(',')}`);
    }
    reasonTags.push(...modality.modalityReasons);
    if (confidence < LOW_CONFIDENCE_FLOOR) reasonTags.push('low_confidence');
    if (riskLevel === RiskLevel.CRITICAL) reasonTags.push('critical_signal');
    if (privacyClass === PrivacyClass.LOCAL_ONLY) reasonTags.push('explicit_private_marker');

    return {
      domain,
      secondaryDomain,
      roleKey: null,
      taskFamily: this.taskFamilyOf(domain, modality.modalityIn, modality.modalityOut),
      modalityIn: modality.modalityIn,
      modalityOut: modality.modalityOut,
      riskLevel,
      privacyClass,
      confidence,
      reasonTags,
    };
  }

  private resolveDomain(
    top: DomainScore | undefined,
    second: DomainScore | undefined,
  ): { domain: DomainTag; secondaryDomain: DomainTag | null; confidence: number } {
    if (top === undefined) {
      return { domain: DomainTag.GENERAL, secondaryDomain: null, confidence: 0.3 };
    }
    const totalHits = top.hits + (second?.hits ?? 0);
    const ratio = totalHits === 0 ? 0 : top.hits / totalHits;
    const baseConf = Math.min(0.5 + 0.1 * top.hits, 0.95);
    const confidence = Math.min(baseConf * Math.max(0.5, ratio), 0.98);
    return {
      domain: top.domain,
      secondaryDomain: second?.domain ?? null,
      confidence: Number(confidence.toFixed(3)),
    };
  }

  private escalateForCriticalSignals(message: string, base: RiskLevel): RiskLevel {
    if (CRITICAL_RISK_REGEX.test(message)) return RiskLevel.CRITICAL;
    return base;
  }

  private derivePrivacyClass(message: string, defaultClass: PrivacyClass): PrivacyClass {
    if (PRIVATE_MARKER_REGEX.test(message)) return PrivacyClass.LOCAL_ONLY;
    return defaultClass;
  }

  private taskFamilyOf(
    domain: DomainTag,
    modalityIn: ReadonlyArray<string>,
    modalityOut: ReadonlyArray<string>,
  ): string {
    if (modalityIn.includes('PDF_INPUT')) return 'pdf-summary';
    if (modalityIn.includes('YOUTUBE_INPUT')) return 'youtube-summary';
    if (modalityIn.includes('IMAGE_INPUT')) return 'image-analysis';
    if (modalityOut.includes('IMAGE_OUTPUT')) return 'image-generation';
    if (modalityOut.includes('STRUCTURED_OUTPUT')) return `${domain.toLowerCase()}-structured`;
    return `${domain.toLowerCase()}-direct`;
  }
}
