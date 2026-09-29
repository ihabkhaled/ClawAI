import { z } from 'zod';
import {
  GATEWAY_HEADER_FORBIDDEN_NAMES,
  GATEWAY_HEADER_NAME_PATTERN,
  GATEWAY_HEADER_VALUE_FORBIDDEN_PATTERN,
  GATEWAY_HEADER_VALUE_MAX_LENGTH,
  GATEWAY_HEADERS_MAX_COUNT,
} from '../constants/gateway-headers.constants';

// Extra headers for an LLM gateway in front of the provider (F092). An empty
// object on update CLEARS the stored headers; omitting the field keeps them.
export const gatewayHeadersSchema = z
  .record(
    z.string().regex(GATEWAY_HEADER_NAME_PATTERN, 'Header name is not a valid HTTP token'),
    z
      .string()
      .min(1, 'Header value is required')
      .max(GATEWAY_HEADER_VALUE_MAX_LENGTH, 'Header value is too long')
      .refine((value) => !GATEWAY_HEADER_VALUE_FORBIDDEN_PATTERN.test(value), {
        message: 'Header value must not contain line breaks',
      }),
  )
  .superRefine((headers, ctx) => {
    const names = Object.keys(headers);
    if (names.length > GATEWAY_HEADERS_MAX_COUNT) {
      ctx.addIssue({
        code: 'custom',
        message: `At most ${String(GATEWAY_HEADERS_MAX_COUNT)} gateway headers`,
      });
    }
    const seen = new Set<string>();
    for (const name of names) {
      const lower = name.toLowerCase();
      if (GATEWAY_HEADER_FORBIDDEN_NAMES.has(lower)) {
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message: `${name} is managed by the connector and cannot be set as a gateway header`,
        });
      }
      if (seen.has(lower)) {
        ctx.addIssue({ code: 'custom', path: [name], message: `${name} is set twice` });
      }
      seen.add(lower);
    }
  });

export type GatewayHeadersDto = z.infer<typeof gatewayHeadersSchema>;
