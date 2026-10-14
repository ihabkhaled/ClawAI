import {
  PUBLICATION_CARD_CANDIDATE_PATTERN,
  PUBLICATION_EMAIL_PATTERN,
  PUBLICATION_FINDING_CONTEXT_CHARS,
  PUBLICATION_IBAN_PATTERN,
  PUBLICATION_MAX_FINDINGS,
  PUBLICATION_REASON_ORDER,
  PUBLICATION_SECRET_PATTERNS,
  PUBLICATION_SSN_PATTERN,
} from '../constants/publication-safety.constants';
import { resolveCitationMarkers } from './citation-marker.utility';
import { foldDigits } from './digit-folding.utility';
import type {
  PublicationSafetyFinding,
  PublicationSafetyReason,
  PublicationSafetyReport,
  PublicationSafetyResult,
} from '../types/publication-safety.types';

function blank(match: string): string {
  return ' '.repeat(match.length);
}

/**
 * The article body without anything that is not prose: markdown link targets, evidence markers
 * such as `[a5505c418699ab68]` (any digit script, any bracket style) and bare URLs. Linear passes
 * only. Markers are removed, not blanked, so a position in the result is not a position in the
 * input; excerpts are cut from the result itself.
 */
export function stripNonProse(markdown: string): string {
  const withoutLinks = markdown.replaceAll(
    /\]\([^)\s]{1,2048}\)/gu,
    (match) => `]${blank(match.slice(1))}`,
  );
  return resolveCitationMarkers(withoutLinks, [])
    .replaceAll(/(?:https?|ftp):\/\/[^\s<>)\]]{1,2048}/giu, blank)
    .replaceAll(/\bwww\.[^\s<>)\]]{1,2048}/giu, blank);
}

/** The Luhn checksum every real payment card number satisfies. */
export function passesLuhn(digits: string): boolean {
  if (!/^\d{13,19}$/u.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = digits.charCodeAt(index) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

function excerptAround(text: string, start: number, end: number, shown: string): string {
  const before = text.slice(Math.max(0, start - PUBLICATION_FINDING_CONTEXT_CHARS), start);
  const after = text.slice(end, end + PUBLICATION_FINDING_CONTEXT_CHARS);
  return `${before}${shown}${after}`.replaceAll(/\s+/gu, ' ').trim();
}

function maskCard(value: string): string {
  const digits = value.replaceAll(/\D/gu, '');
  return `${digits.slice(0, 4)} •••• •••• ${digits.slice(-4)}`;
}

function collectFindings(markdown: string, urls: readonly string[]): PublicationSafetyFinding[] {
  const full = foldDigits([markdown, ...urls].join('\n'));
  const prose = foldDigits(stripNonProse(markdown));
  const findings: PublicationSafetyFinding[] = [];
  const add = (kind: PublicationSafetyFinding['kind'], excerpt: string): void => {
    findings.push({
      reason: kind === 'SECRET' ? 'POSSIBLE_SECRET' : 'POSSIBLE_PII',
      kind,
      excerpt,
    });
  };

  for (const pattern of PUBLICATION_SECRET_PATTERNS) {
    const match = pattern.exec(full);
    if (match) {
      const shown = `${match[0].slice(0, 4)}…`;
      add('SECRET', excerptAround(full, match.index, match.index + match[0].length, shown));
    }
  }
  const email = PUBLICATION_EMAIL_PATTERN.exec(full);
  if (email) {
    add('EMAIL', excerptAround(full, email.index, email.index + email[0].length, email[0]));
  }
  for (const candidate of prose.matchAll(PUBLICATION_CARD_CANDIDATE_PATTERN)) {
    if (passesLuhn(candidate[0].replaceAll(/\D/gu, ''))) {
      const end = candidate.index + candidate[0].length;
      add('CARD', excerptAround(prose, candidate.index, end, maskCard(candidate[0])));
    }
  }
  const ssn = PUBLICATION_SSN_PATTERN.exec(prose);
  if (ssn) add('SSN', excerptAround(prose, ssn.index, ssn.index + ssn[0].length, ssn[0]));
  const iban = PUBLICATION_IBAN_PATTERN.exec(prose);
  if (iban) add('IBAN', excerptAround(prose, iban.index, iban.index + iban[0].length, iban[0]));
  return findings;
}

function reasonsOf(findings: PublicationSafetyFinding[]): PublicationSafetyReason[] {
  return PUBLICATION_REASON_ORDER.filter((reason) =>
    findings.some((finding) => finding.reason === reason),
  );
}

/**
 * Judges an article. `urls` are the citation targets: they are scanned for secrets and addresses
 * (dangerous anywhere) but never for card, SSN or IBAN shapes, because an id inside a link is not
 * personal data. A card-like number must pass the Luhn checksum.
 */
export function evaluatePublicationSafety(
  markdown: string,
  urls: readonly string[] = [],
): PublicationSafetyResult {
  const reasons = reasonsOf(collectFindings(markdown, urls));
  return { approved: reasons.length === 0, reasons };
}

/** Same verdict plus the flagged passages (secrets and cards masked) so the owner can remove them. */
export function describePublicationSafety(
  markdown: string,
  urls: readonly string[] = [],
): PublicationSafetyReport {
  const findings = collectFindings(markdown, urls);
  const reasons = reasonsOf(findings);
  return {
    approved: reasons.length === 0,
    reasons,
    findings: findings.slice(0, PUBLICATION_MAX_FINDINGS),
  };
}
