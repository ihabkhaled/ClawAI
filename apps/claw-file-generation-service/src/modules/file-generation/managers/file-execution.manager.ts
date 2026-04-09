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
    this.logger.debug(`Converting content to ${format} (${String(content.length)} chars)`);

    switch (format.toUpperCase()) {
      case 'TXT':
        return convertToTxt(content);
      case 'MD':
        return convertToMarkdown(content);
      case 'JSON':
        return convertToJson(content);
      case 'CSV':
        return convertToCsv(content);
      case 'HTML':
        return convertToHtml(content);
      case 'PDF':
        return convertToPdf(content);
      case 'DOCX':
        return convertToDocx(content);
      default:
        return convertToTxt(content);
    }
  }

  async storeFile(params: {
    userId: string;
    filename: string;
    format: string;
    buffer: Buffer;
  }): Promise<string> {
    const config = AppConfig.get();
    const mimeType = FORMAT_TO_MIME_TYPE[params.format.toUpperCase()] ?? 'application/octet-stream';
    const base64Data = params.buffer.toString('base64');

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

    return response.fileId;
  }

  generateFilename(format: string): string {
    const extension = FORMAT_TO_EXTENSION[format.toUpperCase()] ?? 'txt';
    const timestamp = Date.now();
    return `generated-${String(timestamp)}.${extension}`;
  }
}
