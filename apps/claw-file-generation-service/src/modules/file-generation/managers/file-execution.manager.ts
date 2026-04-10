import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpPost } from '@common/utilities';
import { FORMAT_TO_EXTENSION, FORMAT_TO_MIME_TYPE } from '../../../common/constants';
import { type StoreFileResponse } from '../types/file-generation.types';
import { convertToTxt } from '../adapters/txt.adapter';
import { convertToMarkdown } from '../adapters/md.adapter';
import { convertToJson } from '../adapters/json.adapter';
import { convertToCsv } from '../adapters/csv.adapter';
import { convertToHtml } from '../adapters/html.adapter';
import { convertToPdf } from '../adapters/pdf.adapter';
import { convertToDocx } from '../adapters/docx.adapter';

@Injectable()
export class FileExecutionManager {
  private readonly logger = new Logger(FileExecutionManager.name);

  async convert(content: string, format: string): Promise<Buffer> {
    this.logger.log(`convert: converting content to ${format} (${String(content.length)} chars)`);
    const upperFormat = format.toUpperCase();
    this.logger.debug(`convert: dispatching to ${upperFormat} converter`);

    let result: Buffer;
    switch (upperFormat) {
      case 'TXT':
        result = await convertToTxt(content);
        break;
      case 'MD':
        result = await convertToMarkdown(content);
        break;
      case 'JSON':
        result = await convertToJson(content);
        break;
      case 'CSV':
        result = await convertToCsv(content);
        break;
      case 'HTML':
        result = await convertToHtml(content);
        break;
      case 'PDF':
        result = await convertToPdf(content);
        break;
      case 'DOCX':
        result = await convertToDocx(content);
        break;
      default:
        this.logger.debug(`convert: unknown format "${format}" — falling back to TXT`);
        result = await convertToTxt(content);
        break;
    }
    this.logger.debug(`convert: conversion complete — outputSize=${String(result.length)} bytes`);
    return result;
  }

  async storeFile(params: {
    userId: string;
    filename: string;
    format: string;
    buffer: Buffer;
  }): Promise<string> {
    this.logger.log(`storeFile: storing file "${params.filename}" format=${params.format} size=${String(params.buffer.length)} bytes`);
    const config = AppConfig.get();
    const mimeType = FORMAT_TO_MIME_TYPE[params.format.toUpperCase()] ?? 'application/octet-stream';
    this.logger.debug(`storeFile: resolved mimeType=${mimeType}`);
    const base64Data = params.buffer.toString('base64');
    this.logger.debug(`storeFile: base64 encoded — length=${String(base64Data.length)}`);

    this.logger.debug(`storeFile: sending to file service at ${config.FILE_SERVICE_URL}`);
    const response = await httpPost<StoreFileResponse>(
      `${config.FILE_SERVICE_URL}/api/v1/internal/files/store-image`,
      {
        userId: params.userId,
        filename: params.filename,
        mimeType,
        base64Data,
      },
      { timeout: 30_000 },
    );

    this.logger.debug(`storeFile: file stored — fileId=${response.fileId}`);
    return response.fileId;
  }

  generateFilename(format: string): string {
    const extension = FORMAT_TO_EXTENSION[format.toUpperCase()] ?? 'txt';
    const timestamp = Date.now();
    const filename = `generated-${String(timestamp)}.${extension}`;
    this.logger.debug(`generateFilename: generated "${filename}" for format=${format}`);
    return filename;
  }
}
