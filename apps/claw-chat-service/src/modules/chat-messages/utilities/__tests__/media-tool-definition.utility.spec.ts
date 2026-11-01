import { describe, expect, it } from 'vitest';

import { ChatSurface } from '../../../../common/enums/chat-surface.enum';
import { MediaGenerationState } from '../../enums/media-generation-state.enum';
import { MediaKind } from '../../enums/media-kind.enum';
import type { AssembledContext } from '../../types/context.types';
import { buildMediaMetaPart, imageGenerationIds } from '../media-metadata.utility';
import { wantsMediaTools } from '../media-tool-eligibility.utility';
import {
  buildMediaToolCatalog,
  mediaKindOfTool,
  parseMediaToolArgs,
  resolveMediaTarget,
  resolveMediaTargets,
  toMediaStartRequest,
} from '../media-tool-definition.utility';

function ctx(text: string, overrides: Partial<AssembledContext> = {}): AssembledContext {
  return {
    userId: 'u',
    systemPrompt: null,
    threadMessages: [{ id: 'm', threadId: 't', role: 'USER', content: text, metadata: null }],
    platformSurface: ChatSurface.CHAT,
    ...overrides,
  } as unknown as AssembledContext;
}

describe('media tool catalog', () => {
  it('defines generate_image, generate_video and generate_audio as valid Runtime tools', () => {
    const catalog = buildMediaToolCatalog([MediaKind.IMAGE, MediaKind.VIDEO, MediaKind.AUDIO]);
    expect(catalog.map((tool) => tool.name)).toEqual([
      'generate_image',
      'generate_video',
      'generate_audio',
    ]);
    for (const tool of catalog) {
      expect(tool.operations).toEqual(['generate']);
      expect(tool.targetIds).toEqual(['clawai-media']);
      expect((tool.inputSchema as { required: string[] }).required).toEqual(['prompt']);
    }
    const audio = catalog[2]?.inputSchema as { properties: Record<string, { enum?: string[] }> };
    expect(audio.properties['kind']?.enum).toEqual(['SPEECH', 'MUSIC']);
  });

  it('maps a tool name back to its kind', () => {
    expect(mediaKindOfTool('generate_video')).toBe(MediaKind.VIDEO);
    expect(mediaKindOfTool('web_search')).toBeUndefined();
  });
});

describe('parseMediaToolArgs', () => {
  it('needs a prompt', () => {
    expect(parseMediaToolArgs(MediaKind.IMAGE, {}).ok).toBe(false);
    expect(parseMediaToolArgs(MediaKind.IMAGE, { prompt: '  ' }).ok).toBe(false);
  });

  it('drops a bad optional field instead of failing the call', () => {
    const parsed = parseMediaToolArgs(MediaKind.VIDEO, {
      prompt: 'fox',
      durationSeconds: 99,
      aspectRatio: '1:1',
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.ok && parsed.args.durationSeconds).toBeUndefined();
    expect(parsed.ok && parsed.args.aspectRatio).toBeUndefined();
  });

  it('accepts a video duration in range and an audio kind', () => {
    const video = parseMediaToolArgs(MediaKind.VIDEO, { prompt: 'fox', durationSeconds: '6' });
    expect(video.ok && video.args.durationSeconds).toBe(6);
    const audio = parseMediaToolArgs(MediaKind.AUDIO, { prompt: 'hello', kind: 'MUSIC' });
    expect(audio.ok && audio.args.audioKind).toBe('MUSIC');
  });
});

describe('resolveMediaTarget and toMediaStartRequest', () => {
  it('uses the default model unless a known one is named', () => {
    const base = { kind: MediaKind.IMAGE, prompt: 'p' } as const;
    expect(resolveMediaTarget({ ...base })).toEqual({
      provider: 'IMAGE_GEMINI',
      model: 'gemini-2.5-flash-image',
    });
    expect(resolveMediaTarget({ ...base, model: 'gpt-image-1' })).toEqual({
      provider: 'IMAGE_OPENAI',
      model: 'gpt-image-1',
    });
    expect(resolveMediaTarget({ ...base, model: 'grok-imagine-image' })).toEqual({
      provider: 'IMAGE_GROK',
      model: 'grok-imagine-image',
    });
    expect(resolveMediaTarget({ ...base, model: 'grok-imagine-video' }).provider).toBe(
      'IMAGE_GEMINI',
    );
    expect(resolveMediaTarget({ ...base, model: 'made-up' }).provider).toBe('IMAGE_GEMINI');
    expect(
      resolveMediaTarget({ kind: MediaKind.AUDIO, prompt: 'p', model: 'gemini-tts' }).provider,
    ).toBe('AUDIO_GEMINI');
  });

  it('sends pixels only to the OpenAI image model', () => {
    const turn = { userId: 'u' };
    const openai = toMediaStartRequest(
      { kind: MediaKind.IMAGE, prompt: 'p', size: 'portrait' },
      { provider: 'IMAGE_OPENAI', model: 'gpt-image-1' },
      turn,
    );
    expect(openai).toMatchObject({ width: 1024, height: 1536 });
    const gemini = toMediaStartRequest(
      { kind: MediaKind.IMAGE, prompt: 'p', size: 'portrait' },
      { provider: 'IMAGE_GEMINI', model: 'm' },
      turn,
    );
    expect(gemini.width).toBeUndefined();
  });

  it('defaults speech for audio and 4s 16:9 for video', () => {
    const turn = { userId: 'u' };
    expect(
      toMediaStartRequest(
        { kind: MediaKind.AUDIO, prompt: 'hi' },
        { provider: 'AUDIO_OPENAI', model: undefined },
        turn,
      ).audioKind,
    ).toBe('SPEECH');
    expect(
      toMediaStartRequest(
        { kind: MediaKind.VIDEO, prompt: 'hi' },
        { provider: 'VIDEO_GEMINI', model: 'm' },
        turn,
      ),
    ).toMatchObject({ durationSeconds: 4, aspectRatio: '16:9' });
  });
});

describe('resolveMediaTargets', () => {
  it('lists the cloud providers of the kind, best first, never local', () => {
    const providers = (kind: MediaKind): string[] =>
      resolveMediaTargets({ kind, prompt: 'p' }).map((t) => t.provider);
    expect(providers(MediaKind.IMAGE)).toEqual(['IMAGE_GEMINI', 'IMAGE_OPENAI', 'IMAGE_GROK']);
    expect(providers(MediaKind.VIDEO)).toEqual(['VIDEO_GEMINI', 'VIDEO_GROK']);
    expect(providers(MediaKind.AUDIO)).toEqual(['AUDIO_OPENAI', 'AUDIO_GEMINI']);
  });

  it('a model the user never named is ignored: the full fallback list applies', () => {
    const args = { kind: MediaKind.IMAGE, prompt: 'p', model: 'gemini-2.5-flash-image' } as const;
    expect(resolveMediaTargets(args, 'draw a cat')).toHaveLength(3);
    expect(resolveMediaTargets(args, 'use gemini-2.5-flash-image to draw a cat')).toHaveLength(1);
  });

  it('a named model is the only target', () => {
    expect(
      resolveMediaTargets({ kind: MediaKind.IMAGE, prompt: 'p', model: 'grok-imagine-image' }),
    ).toEqual([{ provider: 'IMAGE_GROK', model: 'grok-imagine-image' }]);
  });
});

describe('media tool schema', () => {
  it('tells the model to honor a model the user names and lists the known ones', () => {
    const image = buildMediaToolCatalog([MediaKind.IMAGE])[0];
    const props = (image?.inputSchema as { properties: Record<string, { description: string }> })
      .properties;
    expect(props['model']?.description).toContain('grok-imagine-image');
    expect(props['model']?.description).toContain('names a model');
  });
});

describe('wantsMediaTools', () => {
  it('offers tools to a tool-calling provider on a media-word turn of a card-capable surface', () => {
    expect(wantsMediaTools(ctx('draw me a fox'), 'GROK', 'grok-4.20-0309-non-reasoning')).toBe(
      true,
    );
    expect(
      wantsMediaTools(ctx('make a short video of waves'), 'OPENAI', 'grok-4.20-0309-non-reasoning'),
    ).toBe(true);
    expect(
      wantsMediaTools(ctx('read this aloud'), 'ANTHROPIC', 'grok-4.20-0309-non-reasoning'),
    ).toBe(true);
    expect(wantsMediaTools(ctx('ارسم لي صورة قطة'), 'GEMINI', 'grok-4.20-0309-non-reasoning')).toBe(
      true,
    );
  });

  it('does not touch an ordinary turn, so it keeps streaming', () => {
    expect(wantsMediaTools(ctx('explain monads'), 'GROK', 'grok-4.20-0309-non-reasoning')).toBe(
      false,
    );
  });

  it('stays out of the way of other tool lanes, other surfaces and non-tool providers', () => {
    expect(
      wantsMediaTools(
        ctx('draw a fox', { mediaToolsHandled: true }),
        'GROK',
        'grok-4.20-0309-non-reasoning',
      ),
    ).toBe(false);
    expect(
      wantsMediaTools(ctx('draw a fox'), 'GROK', 'grok-4.20-0309-non-reasoning', {
        fastPathEnabled: false,
        applyShortResponseConstraint: false,
        toolCatalog: [{} as never],
      }),
    ).toBe(false);
    expect(
      wantsMediaTools(
        ctx('draw a fox', { platformSurface: ChatSurface.REPAIR }),
        'GROK',
        'grok-4.20-0309-non-reasoning',
      ),
    ).toBe(false);
    expect(
      wantsMediaTools(
        ctx('draw a fox', { platformSurface: ChatSurface.BEST_OF_N }),
        'GROK',
        'grok-4.20-0309-non-reasoning',
      ),
    ).toBe(false);
    expect(wantsMediaTools(ctx('draw a fox'), 'IMAGE_GEMINI', 'grok-4.20-0309-non-reasoning')).toBe(
      false,
    );
    expect(
      wantsMediaTools(ctx('draw a fox'), 'SOME_UNKNOWN_PROVIDER', 'grok-4.20-0309-non-reasoning'),
    ).toBe(false);
    // Normal chat never sets a surface: absent means CHAT.
    expect(
      wantsMediaTools(
        ctx('draw a fox', { platformSurface: undefined }),
        'GROK',
        'grok-4.20-0309-non-reasoning',
      ),
    ).toBe(true);
  });

  it('offers the tools to grok-4.20-0309-non-reasoning on GROK without any registry flag', () => {
    expect(
      wantsMediaTools(
        ctx('put together a nice picture of a red apple'),
        'GROK',
        'grok-4.20-0309-non-reasoning',
      ),
    ).toBe(true);
  });

  it('does not offer them to a media generator or an embedding model', () => {
    expect(wantsMediaTools(ctx('draw a fox'), 'GROK', 'grok-imagine-video')).toBe(false);
    expect(wantsMediaTools(ctx('draw a fox'), 'OPENAI', 'text-embedding-3-small')).toBe(false);
  });

  it('serves Compare lanes', () => {
    expect(
      wantsMediaTools(
        ctx('draw a fox', { platformSurface: ChatSurface.COMPARE }),
        'GROK',
        'grok-4.20-0309-non-reasoning',
      ),
    ).toBe(true);
  });
});

describe('asksToCreateMedia: tools only when the user asks to CREATE media', () => {
  const grok = 'grok-4.20-0309-non-reasoning';
  it('does not offer the tools for discussion', () => {
    expect(wantsMediaTools(ctx('explain how diffusion models make images'), 'GROK', grok)).toBe(
      false,
    );
    expect(wantsMediaTools(ctx('what is a music video?'), 'GROK', grok)).toBe(false);
    expect(wantsMediaTools(ctx('Describe how Pixar makes a movie'), 'GROK', grok)).toBe(false);
  });

  it('does not offer the tools for a quoted-literal or echo request', () => {
    expect(wantsMediaTools(ctx('say the exact words: Image generated: done'), 'GROK', grok)).toBe(
      false,
    );
    expect(wantsMediaTools(ctx('repeat after me: here is the video I created'), 'GROK', grok)).toBe(
      false,
    );
  });

  it('still offers them when the user asks to make media, politely or not', () => {
    expect(wantsMediaTools(ctx('Can you please draw a red apple?'), 'GROK', grok)).toBe(true);
    expect(
      wantsMediaTools(ctx('Use the grok-imagine-image model to draw a red apple'), 'GROK', grok),
    ).toBe(true);
    expect(wantsMediaTools(ctx('put together a nice picture of a red apple'), 'GROK', grok)).toBe(
      true,
    );
    expect(wantsMediaTools(ctx('make a 5 second video of waves'), 'GROK', grok)).toBe(true);
  });

  it('keeps Ollama on the router redirect: kimi-k2.6:cloud is never offered the tools', () => {
    expect(wantsMediaTools(ctx('draw a red apple'), 'OLLAMA', 'kimi-k2.6:cloud')).toBe(false);
    expect(wantsMediaTools(ctx('draw a red apple'), 'local-ollama', 'qwen3:7b')).toBe(false);
  });
});

describe('media metadata', () => {
  it('adds mediaGenerations only when media was made', () => {
    expect(buildMediaMetaPart({})).toEqual({});
    const refs = [
      { kind: MediaKind.IMAGE, id: 'g1', status: MediaGenerationState.COMPLETED, prompt: 'p' },
    ] as const;
    expect(buildMediaMetaPart({ mediaGenerations: refs })).toEqual({ mediaGenerations: refs });
    expect(
      imageGenerationIds([
        ...refs,
        { kind: MediaKind.VIDEO, id: 'v', status: MediaGenerationState.COMPLETED, prompt: '' },
      ]),
    ).toEqual(['g1']);
  });
});
