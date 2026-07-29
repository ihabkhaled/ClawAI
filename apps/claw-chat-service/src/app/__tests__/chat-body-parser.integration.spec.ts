import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { configureChatBodyParser } from '../utilities/chat-body-parser.utility';

@Controller('body-parser-test')
class BodyParserTestController {
  @Post()
  accept(@Body() body: { content: string }): { length: number } {
    return { length: body.content.length };
  }
}

describe('chat request body parser', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    const moduleReference = await Test.createTestingModule({
      controllers: [BodyParserTestController],
    }).compile();
    const expressApp = moduleReference.createNestApplication<NestExpressApplication>();
    configureChatBodyParser(expressApp);
    expressApp.useGlobalFilters(new GlobalExceptionFilter());
    await expressApp.listen(0, '127.0.0.1');
    app = expressApp;
    baseUrl = await expressApp.getUrl();
  });

  afterEach(async () => {
    await app.close();
  });

  it('accepts a bounded coding-agent context above the Express default', async () => {
    const content = 'line\n'.repeat(40_000);
    const response = await fetch(`${baseUrl}/body-parser-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ length: content.length });
  });

  it('returns 413 rather than 500 above the explicit chat payload bound', async () => {
    const response = await fetch(`${baseUrl}/body-parser-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'x'.repeat(1_100_000) }),
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      statusCode: 413,
    });
  });
});
