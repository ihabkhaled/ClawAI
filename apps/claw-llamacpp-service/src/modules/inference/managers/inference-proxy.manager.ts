import { Injectable, Logger } from '@nestjs/common';
import { request } from 'undici';
import { type Request, type Response } from 'express';
import { ThinkTagScanner } from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import {
  buildSyntheticTailFrame,
  rewriteNonStreamingPayload,
  rewriteStreamingChunk,
} from '../utilities/think-tag-rewriter.utility';
import { type ProxyOptions } from '../types/inference-proxy.types';

@Injectable()
export class InferenceProxyManager {
  private readonly logger = new Logger(InferenceProxyManager.name);

  async proxyChat(req: Request, res: Response, port: number, body: unknown): Promise<void> {
    const isStream = (body as { stream?: boolean })?.stream === true;
    const config = AppConfig.get();
    const upstream = `http://${config.LLAMACPP_BIND_HOST}:${port}/v1/chat/completions`;
    this.logger.log(
      `proxyChat: upstream=${upstream} stream=${String(isStream)} reasoningExtraction=${String(config.LLAMACPP_REASONING_EXTRACTION_ENABLED)}`,
    );
    const controller = new AbortController();
    req.on('close', () => {
      if (!res.writableEnded) {
        controller.abort();
      }
    });
    const options: ProxyOptions = {
      reasoningExtractionEnabled: config.LLAMACPP_REASONING_EXTRACTION_ENABLED,
      isStream,
    };

    try {
      await this.dispatch(upstream, body, controller, res, options);
    } catch (error) {
      this.logger.error(`proxyChat: failed — ${(error as Error).message}`);
      if (!res.headersSent) {
        res.status(502).json({
          error: { code: 'UPSTREAM_ERROR', message: 'Inference upstream unavailable' },
        });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  }

  private async dispatch(
    upstream: string,
    body: unknown,
    controller: AbortController,
    res: Response,
    options: ProxyOptions,
  ): Promise<void> {
    const response = await request(upstream, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      bodyTimeout: 0,
    });
    res.status(response.statusCode);
    if (options.isStream) {
      await this.streamResponse(response.body, res, options);
      return;
    }
    const text = await response.body.text();
    res.setHeader('Content-Type', 'application/json');
    res.send(this.rewriteNonStreamingBody(text, options));
  }

  private async streamResponse(
    body: NodeJS.ReadableStream,
    res: Response,
    options: ProxyOptions,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (!options.reasoningExtractionEnabled) {
      this.pipeRawStream(body, res);
      return;
    }
    await this.streamWithScanner(body, res);
  }

  private pipeRawStream(body: NodeJS.ReadableStream, res: Response): void {
    body.pipe(res);
    body.on('error', (error) => {
      this.logger.error(`pipeRawStream: error — ${error.message}`);
      if (!res.writableEnded) {
        res.end();
      }
    });
  }

  private async streamWithScanner(body: NodeJS.ReadableStream, res: Response): Promise<void> {
    const scanner = new ThinkTagScanner();
    let pending = '';
    body.setEncoding('utf8');
    body.on('data', (chunk: string) => {
      try {
        pending += chunk;
        const { rewritten, leftover } = rewriteStreamingChunk(pending, scanner);
        pending = leftover;
        if (rewritten.length > 0) {
          res.write(rewritten);
        }
      } catch (error) {
        this.logger.error(`streamWithScanner: scan error — ${(error as Error).message}`);
      }
    });
    body.on('end', () => {
      this.flushStreamTail(pending, scanner, res);
    });
    body.on('error', (error) => {
      this.logger.error(`streamWithScanner: stream error — ${error.message}`);
      if (!res.writableEnded) {
        res.end();
      }
    });
  }

  private flushStreamTail(pending: string, scanner: ThinkTagScanner, res: Response): void {
    try {
      if (pending.length > 0) {
        const { rewritten, leftover } = rewriteStreamingChunk(pending, scanner, true);
        if (rewritten.length > 0) {
          res.write(rewritten);
        }
        if (leftover.length > 0) {
          res.write(leftover);
        }
      }
      const tail = scanner.drain();
      const synthetic = buildSyntheticTailFrame(tail.reasoning, tail.content);
      if (synthetic) {
        res.write(synthetic);
      }
    } catch (error) {
      this.logger.error(`flushStreamTail: ${(error as Error).message}`);
    }
    if (!res.writableEnded) {
      res.end();
    }
  }

  private rewriteNonStreamingBody(rawJson: string, options: ProxyOptions): string {
    if (!options.reasoningExtractionEnabled) {
      return rawJson;
    }
    return rewriteNonStreamingPayload(rawJson);
  }
}
