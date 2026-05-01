import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { Logger } from '@nestjs/common';

const logger = new Logger('Sha256');

export async function computeSha256(filePath: string): Promise<string> {
  logger.debug(`computeSha256: hashing ${filePath}`);
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => {
      const hex = hash.digest('hex');
      logger.debug(`computeSha256: ${filePath} → ${hex.slice(0, 12)}…`);
      resolve(hex);
    });
    stream.on('error', (error) => {
      logger.error(`computeSha256: failed for ${filePath} — ${error.message}`);
      reject(error);
    });
  });
}

export async function verifySha256(filePath: string, expectedHex: string): Promise<boolean> {
  const actual = await computeSha256(filePath);
  return actual.toLowerCase() === expectedHex.toLowerCase();
}
