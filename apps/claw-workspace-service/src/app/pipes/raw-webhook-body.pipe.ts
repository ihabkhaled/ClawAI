import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// Defends against the CodeQL "type confusion through parameter tampering"
// alert (#24). Express body-parser middleware may decode an incoming webhook
// payload into any JS shape (Buffer, string, plain object, array). Calling
// JSON.stringify(req.body) on an attacker-controlled non-Buffer would leak
// or coerce arbitrary content into the downstream signature verifier and
// hash the wrong bytes. We accept ONLY Buffer or string and reject the rest.
@Injectable()
export class RawWebhookBodyPipe implements PipeTransform<unknown, Buffer> {
  transform(value: unknown): Buffer {
    if (Buffer.isBuffer(value)) {
      return value;
    }
    if (typeof value === 'string') {
      return Buffer.from(value, 'utf8');
    }
    throw new BadRequestException('Webhook body must be a raw buffer or string');
  }
}
