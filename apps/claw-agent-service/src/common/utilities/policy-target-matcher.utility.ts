import { Logger } from '@nestjs/common';
import picomatch from 'picomatch';

import { CapabilityClass } from '../enums/capability-class.enum';
import { CapabilityOperation } from '../enums/capability-operation.enum';
import type { RiskAssessmentInput } from '../../modules/agent/types/capability.types';

const logger = new Logger('PolicyTargetMatcherUtility');

/**
 * Stream 10 — evaluates `AccessPolicy.targetMatcherJson` against a
 * proposed capability invocation. Per-class matcher shapes are
 * documented in `capability-policy.constants.ts`. Returning `true`
 * means "this policy applies to this invocation."
 *
 * Hard rules:
 *  - Glob match uses picomatch with case-insensitive default for FS.
 *  - All regex matchers compile via `safeMatch` with try/catch — bad
 *    regex falls back to false (logged once).
 *  - Unknown matcher keys are ignored (forward-compat).
 */
export function matchesCapabilityTarget(
  matcher: Record<string, unknown>,
  input: RiskAssessmentInput,
): boolean {
  switch (input.capabilityClass) {
    case CapabilityClass.FILESYSTEM:
      return matchesFilesystem(matcher, input);
    case CapabilityClass.PROCESS:
      return matchesProcess(matcher, input);
    case CapabilityClass.BROWSER:
      return matchesBrowser(matcher, input);
    case CapabilityClass.SCREEN:
      return matchesScreen(matcher, input);
    case CapabilityClass.CLIPBOARD:
      return matchesClipboard(matcher, input);
    case CapabilityClass.APPLICATION:
      return matchesApplication(matcher, input);
    case CapabilityClass.AUDIO:
      return matchesAudio(matcher, input);
    default:
      return matchesGeneric(matcher, input);
  }
}

function matchesFilesystem(
  matcher: Record<string, unknown>,
  input: RiskAssessmentInput,
): boolean {
  const path = readString(input.targetDescriptor, 'path');
  if (path === undefined) {
    return matchesGeneric(matcher, input);
  }
  const denyGlobs = readStringArray(matcher, 'pathDenyGlob');
  if (denyGlobs !== undefined && globMatchesAny(denyGlobs, path)) {
    return true;
  }
  const allowGlobs = readStringArray(matcher, 'pathGlob');
  if (allowGlobs !== undefined) {
    return globMatchesAny(allowGlobs, path);
  }
  if (matcher['payloadFlag'] !== undefined) {
    const flagName = String(matcher['payloadFlag']);
    return Boolean((input.payload as Record<string, unknown>)[flagName]);
  }
  return matchesGeneric(matcher, input);
}

function matchesProcess(
  matcher: Record<string, unknown>,
  input: RiskAssessmentInput,
): boolean {
  if (matcher['pidRange'] !== undefined) {
    const range = matcher['pidRange'] as [number, number];
    const pid = readNumber(input.targetDescriptor, 'pid');
    if (pid === undefined || pid < range[0] || pid > range[1]) {
      return false;
    }
    return true;
  }
  if (matcher['binaryNameRegex'] !== undefined) {
    const binary = readString(input.targetDescriptor, 'binaryName')
      ?? readString(input.targetDescriptor, 'binary')
      ?? readString(input.targetDescriptor, 'command');
    if (binary === undefined) {
      return false;
    }
    return safeRegexTest(String(matcher['binaryNameRegex']), binary);
  }
  if (matcher['managedByAgent'] === true) {
    return Boolean(input.targetDescriptor['managedByAgent']);
  }
  if (matcher['uidMatchesCurrentUser'] === true) {
    // The CLI provides this boolean at proposal time; default false
    return input.targetDescriptor['uidMatchesCurrentUser'] !== true;
  }
  return matchesGeneric(matcher, input);
}

function matchesBrowser(
  matcher: Record<string, unknown>,
  input: RiskAssessmentInput,
): boolean {
  const url = readString(input.targetDescriptor, 'url');
  if (url === undefined) {
    return matchesGeneric(matcher, input);
  }
  const denyGlobs = readStringArray(matcher, 'urlDenyGlob');
  if (denyGlobs !== undefined && globMatchesAny(denyGlobs, url)) {
    return true;
  }
  const allowGlobs = readStringArray(matcher, 'urlGlob');
  if (allowGlobs !== undefined && !globMatchesAny(allowGlobs, url)) {
    return false;
  }
  if (matcher['urlPathRegex'] !== undefined) {
    return safeRegexTest(String(matcher['urlPathRegex']), url);
  }
  return matchesGeneric(matcher, input);
}

function matchesScreen(
  matcher: Record<string, unknown>,
  input: RiskAssessmentInput,
): boolean {
  if (matcher['activeAppDenyRegex'] !== undefined) {
    const app = readString(input.targetDescriptor, 'activeApp');
    if (app === undefined) {
      return false;
    }
    return safeRegexTest(String(matcher['activeAppDenyRegex']), app);
  }
  if (matcher['payloadHasRegion'] === true) {
    return input.payload['regionDimensions'] !== undefined;
  }
  return matchesGeneric(matcher, input);
}

function matchesClipboard(
  matcher: Record<string, unknown>,
  input: RiskAssessmentInput,
): boolean {
  if (matcher['payloadFlag'] !== undefined) {
    const flag = String(matcher['payloadFlag']);
    return Boolean(input.payload[flag]);
  }
  return matchesGeneric(matcher, input);
}

function matchesApplication(
  matcher: Record<string, unknown>,
  input: RiskAssessmentInput,
): boolean {
  if (matcher['binaryNameRegex'] !== undefined) {
    const binary = readString(input.targetDescriptor, 'binaryName');
    return binary !== undefined && safeRegexTest(String(matcher['binaryNameRegex']), binary);
  }
  if (matcher['windowTitleRegex'] !== undefined) {
    const title = readString(input.targetDescriptor, 'windowTitleRegex')
      ?? readString(input.targetDescriptor, 'windowTitle');
    if (input.capabilityOperation === CapabilityOperation.SEND_KEYSTROKE && title === undefined) {
      // Mandatory for keystroke ops — absence trips the deny rule
      return false;
    }
    return title !== undefined && safeRegexTest(String(matcher['windowTitleRegex']), title);
  }
  return matchesGeneric(matcher, input);
}

function matchesAudio(
  matcher: Record<string, unknown>,
  input: RiskAssessmentInput,
): boolean {
  if (matcher['routesToCloud'] === true) {
    return input.payload['routeToCloud'] === true;
  }
  if (matcher['sourcePathGlob'] !== undefined) {
    const path = readString(input.targetDescriptor, 'path');
    if (path === undefined) {
      return false;
    }
    const globs = matcher['sourcePathGlob'] as string[];
    return globMatchesAny(globs, path);
  }
  return matchesGeneric(matcher, input);
}

function matchesGeneric(
  matcher: Record<string, unknown>,
  input: RiskAssessmentInput,
): boolean {
  if (matcher['contentRegex'] !== undefined) {
    const haystack = `${JSON.stringify(input.targetDescriptor)}${JSON.stringify(input.payload)}`;
    return safeRegexTest(String(matcher['contentRegex']), haystack);
  }
  if (matcher['recipientDomainRegex'] !== undefined) {
    const domain = readString(input.payload, 'recipientDomain');
    if (domain === undefined) {
      return false;
    }
    return safeRegexTest(String(matcher['recipientDomainRegex']), domain);
  }
  // No matcher keys — treat as catch-all match
  return Object.keys(matcher).length === 0;
}

function readString(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key];
  return typeof v === 'string' ? v : undefined;
}

function readNumber(o: Record<string, unknown>, key: string): number | undefined {
  const v = o[key];
  return typeof v === 'number' ? v : undefined;
}

function readStringArray(
  o: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const v = o[key];
  return Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : undefined;
}

function globMatchesAny(globs: string[], value: string): boolean {
  for (const g of globs) {
    try {
      if (picomatch.isMatch(value, g, { nocase: true, dot: true })) {
        return true;
      }
    } catch (error) {
      logger.warn(`Bad glob "${g}": ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }
  return false;
}

function safeRegexTest(pattern: string, value: string): boolean {
  try {
    // eslint-disable-next-line security/detect-non-literal-regexp
    return new RegExp(pattern).test(value);
  } catch (error) {
    logger.warn(`Bad regex "${pattern}": ${error instanceof Error ? error.message : 'unknown'}`);
    return false;
  }
}
