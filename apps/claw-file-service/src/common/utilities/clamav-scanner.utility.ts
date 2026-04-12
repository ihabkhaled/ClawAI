import { Logger } from '@nestjs/common';
import { connect, type Socket } from 'node:net';
import { AppConfig } from '../../app/config/app.config';
import type { ClamScanResult } from '../../modules/files/types/file-security.types';

const logger = new Logger('ClamAVScanner');

export async function scanBuffer(buffer: Buffer): Promise<ClamScanResult> {
  const config = AppConfig.get();
  if (!config.CLAMAV_ENABLED) {
    logger.debug('scanBuffer: ClamAV disabled — skipping scan');
    return { clean: true, reason: 'scan_disabled' };
  }

  logger.debug(
    `scanBuffer: scanning ${String(buffer.length)} bytes via ClamAV at ${config.CLAMAV_HOST}:${String(config.CLAMAV_PORT)}`,
  );

  try {
    const result = await sendToClam(config.CLAMAV_HOST, config.CLAMAV_PORT, buffer);
    if (result.includes('OK')) {
      logger.debug('scanBuffer: file is clean');
      return { clean: true, reason: 'clean' };
    }
    if (result.includes('FOUND')) {
      const threat = result.replace('stream: ', '').replace(' FOUND', '').trim();
      logger.warn(`scanBuffer: THREAT DETECTED — ${threat}`);
      return { clean: false, reason: threat };
    }
    logger.warn(`scanBuffer: unexpected ClamAV response — ${result}`);
    return { clean: false, reason: `unexpected_response: ${result}` };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`scanBuffer: ClamAV scan failed — ${msg}`);
    return { clean: false, reason: `scan_error: ${msg}` };
  }
}

function sendToClam(host: string, port: number, buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const socket: Socket = connect(port, host, () => {
      const header = Buffer.from('zINSTREAM\0');
      socket.write(header);
      const sizeBuffer = Buffer.alloc(4);
      sizeBuffer.writeUInt32BE(buffer.length, 0);
      socket.write(sizeBuffer);
      socket.write(buffer);
      const terminator = Buffer.alloc(4, 0);
      socket.write(terminator);
    });

    socket.on('data', (chunk: Buffer) => chunks.push(chunk));
    socket.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8').trim()));
    socket.on('error', (err: Error) => reject(err));
    socket.setTimeout(30_000, () => {
      socket.destroy();
      reject(new Error('ClamAV scan timeout'));
    });
  });
}
