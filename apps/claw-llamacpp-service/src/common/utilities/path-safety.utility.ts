import * as path from 'node:path';
import { Logger } from '@nestjs/common';

const logger = new Logger('PathSafety');

export function resolveSafePath(root: string, segment: string): string {
  const resolved = path.resolve(root, segment);
  const normalizedRoot = path.resolve(root) + path.sep;
  if (resolved !== path.resolve(root) && !resolved.startsWith(normalizedRoot)) {
    logger.error(`resolveSafePath: rejected — segment "${segment}" escapes root "${root}"`);
    throw new Error(`Unsafe path: segment "${segment}" resolves outside root "${root}"`);
  }
  return resolved;
}

export function isWithinRoot(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + path.sep);
}
