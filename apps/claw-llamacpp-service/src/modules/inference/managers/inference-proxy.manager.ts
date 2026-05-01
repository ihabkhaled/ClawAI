import { Injectable, Logger } from '@nestjs/common';
import { request } from 'undici';
import { type Request, type Response } from 'express';
import { AppConfig } from '../../../app/config/app.config';

@Injectable()
export class InferenceProxyManager {
  private readonly logger = new Logger(InferenceProxyManager.name);

  async proxyChat(req: Request, res: Response, port: number, body: unknown): Promise<void> {
    const upstream = `http://${AppConfig.get().LLAMACPP_BIND_HOST}:${port}/v1/chat/completions`;
    this.logger.log(`proxyChat: upstream=${upstream} stream=${(body as { stream?: boolean })?.stream === true}`);
    const isStream = (body as { stream?: boolean })?.stream === true;
    const controller = new AbortController();
    req.on('close', () => {
      if (!res.writableEnded) {
        controller.abort();
      }
    });

    try {
      const response = await request(upstream, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
        bodyTimeout: 0,
      });
      res.status(response.statusCode);
      if (isStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        response.body.pipe(res);
        response.body.on('error', (error) => {
          this.logger.error(`proxyChat: stream error — ${error.message}`);
          if (!res.writableEnded) {
            res.end();
          }
        });
      } else {
        const text = await response.body.text();
        res.setHeader('Content-Type', 'application/json');
        res.send(text);
      }
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
}
