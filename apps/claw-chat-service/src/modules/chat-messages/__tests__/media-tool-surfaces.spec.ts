import { describe, expect, it } from 'vitest';

import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import { MEDIA_TOOL_SURFACES } from '../constants/media-tools.constants';
import parallel_execution_manager_source from '../managers/parallel-execution.manager.ts?raw';
import chat_execution_manager_source from '../managers/chat-execution.manager.ts?raw';
import chat_messages_service_source from '../services/chat-messages.service.ts?raw';
import type { AssembledContext } from '../types/context.types';
import { wantsMediaTools } from '../utilities/media-tool-eligibility.utility';

// The media tool guard (rules/59, context/chat-surface-parity-map.md "Media tools").
// A surface is offered the media tools only if its STORE path can carry a media card; a surface
// added to the set without a store path would make media the user paid for disappear.
const CARD_SURFACES = [
  ChatSurface.CHAT,
  ChatSurface.COMPARE,
  ChatSurface.CONSENSUS,
  ChatSurface.ESCALATION,
  ChatSurface.DECOMPOSE,
  ChatSurface.BEST_OF_N,
  ChatSurface.PIPELINE,
  ChatSurface.COST_ENSEMBLE,
  ChatSurface.ROLE_PACK,
  ChatSurface.VERIFY,
];

describe('media tool surfaces', () => {
  it('offers the tools to exactly the surfaces whose stored answer carries a card', () => {
    expect([...MEDIA_TOOL_SURFACES].sort()).toEqual([...CARD_SURFACES].sort());
  });

  it('chat stores mediaGenerations through buildToolMetaPart and links its images', () => {
    expect(chat_messages_service_source).toContain('buildToolMetaPart(llmResponse)');
    expect(chat_messages_service_source).toContain(
      'imageGenerationIds(llmResponse.mediaGenerations)',
    );
  });

  it('Compare lanes carry mediaGenerations from the lane result into the stored message', () => {
    expect(parallel_execution_manager_source).toContain('mediaGenerationsField(llmResponse)');
    expect(parallel_execution_manager_source).toContain('buildMediaMetaPart(response)');
    expect(parallel_execution_manager_source).toContain(
      'this.linkLaneMedia(userId, storedMessages, responses)',
    );
  });

  it('the one chokepoint (callProvider) runs the loop, and a media turn is never streamed', () => {
    expect(chat_execution_manager_source).toMatch(
      /offersMediaTools\(laneInput,\s*provider,\s*model,\s*executionOptions\)/u,
    );
    expect(chat_execution_manager_source).toMatch(
      /offersMediaTools\(\s*executionContext,\s*candidate\.provider,\s*candidate\.model,/u,
    );
    expect(chat_execution_manager_source).toMatch(
      /offersMediaTools\(context,\s*provider,\s*model,\s*undefined\)/u,
    );
  });

  it.each(Object.values(ChatSurface).filter((surface) => !MEDIA_TOOL_SURFACES.has(surface)))(
    '%s (rewrites or grades an answer, never makes one) is never offered the media tools',
    (surface) => {
      const context = {
        userId: 'u',
        systemPrompt: null,
        threadMessages: [
          { id: 'm', threadId: 't', role: 'USER', content: 'draw a fox', metadata: null },
        ],
        platformSurface: surface,
      } as unknown as AssembledContext;
      expect(wantsMediaTools(context, 'GROK', 'grok-4.20-0309-non-reasoning')).toBe(false);
    },
  );
});
