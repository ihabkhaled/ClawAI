import { z } from 'zod';

import { MCP_CURSOR_MAX } from '../constants/mcp.constants';

export const jsonRpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.number(), z.string()]),
  result: z.unknown().optional(),
  error: z.object({ code: z.number(), message: z.string() }).optional(),
});

export const initializeResultSchema = z.object({
  protocolVersion: z.string().max(40),
  serverInfo: z
    .object({ name: z.string().max(200), version: z.string().max(100).optional() })
    .optional(),
});

export const toolsListResultSchema = z.object({
  tools: z.array(z.unknown()),
  nextCursor: z.string().max(MCP_CURSOR_MAX).optional(),
});

export const toolCallResultSchema = z.object({
  content: z.array(z.unknown()).optional(),
  structuredContent: z.unknown().optional(),
  isError: z.boolean().optional(),
});

export const textBlockSchema = z.object({ type: z.literal('text'), text: z.string() });
