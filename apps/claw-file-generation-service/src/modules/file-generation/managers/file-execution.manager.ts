import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import axios from 'axios';
import { buildInterServiceAuthHeader, httpPost } from '@common/utilities';
import { FORMAT_TO_EXTENSION, FORMAT_TO_MIME_TYPE } from '../../../common/constants';
import { type StoreFileResponse } from '../types/file-generation.types';
import { convertToTxt } from '../adapters/txt.adapter';
import { convertToMarkdown } from '../adapters/md.adapter';
import { convertToJson } from '../adapters/json.adapter';
import { convertToCsv } from '../adapters/csv.adapter';
import { convertToHtml } from '../adapters/html.adapter';
import { PdfRenderer } from '../adapters/pdf.adapter';
import { convertToDocx } from '../adapters/docx.adapter';

@Injectable()
export class FileExecutionManager {
  private readonly logger = new Logger(FileExecutionManager.name);
  private readonly pdfRenderer = new PdfRenderer();

  /** `title` names the document (PDF/DOCX metadata, HTML <title>); null uses its first heading. */
  async convert(content: string, format: string, title: string | null = null): Promise<Buffer> {
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
        result = convertToHtml(content, title);
        break;
      case 'PDF':
        result = this.pdfRenderer.render(content, title);
        break;
      case 'DOCX':
        result = await convertToDocx(content, title);
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
    this.logger.log(
      `storeFile: storing file "${params.filename}" format=${params.format} size=${String(params.buffer.length)} bytes`,
    );
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
      {
        timeout: 30_000,
        headers: { Authorization: buildInterServiceAuthHeader() },
      },
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

  /**
   * The stored bytes, streamed from file-service over the service token. The
   * browser never learns the file-service id or where the bytes live.
   */
  async openStoredFile(fileId: string): Promise<NodeJS.ReadableStream> {
    const config = AppConfig.get();
    const response = await axios.get<NodeJS.ReadableStream>(
      `${config.FILE_SERVICE_URL}/api/v1/internal/files/download-internal/${encodeURIComponent(fileId)}`,
      {
        responseType: 'stream',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeout: 30_000,
      },
    );
    return response.data;
  }

  /** Deletes stored bytes; the owner is checked by file-service. */
  async deleteStoredFile(fileId: string, userId: string): Promise<void> {
    const config = AppConfig.get();
    await axios.delete(
      `${config.FILE_SERVICE_URL}/api/v1/internal/files/${encodeURIComponent(fileId)}`,
      {
        params: { userId },
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeout: 15_000,
        // Already gone counts as deleted, or the sweep would retry it forever.
        validateStatus: (status) => status < 300 || status === 404,
      },
    );
  }
}
