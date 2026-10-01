import type { AssembledContext } from '../../types/context.types';
import {
  boundVideoPrompt,
  buildVideoPlannerPrompt,
  firstSourceImageId,
  parsePlannedVideoPrompt,
} from '../video-prompt.utility';

const message = (
  role: 'USER' | 'ASSISTANT',
  content: string,
): AssembledContext['threadMessages'][0] =>
  ({ role, content, id: content.slice(0, 8), threadId: 't1' }) as never;

const contextWith = (overrides: Partial<AssembledContext> = {}): AssembledContext =>
  ({
    userId: 'u1',
    systemPrompt: null,
    threadMessages: [],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
    platformOrigin: 'https://claw-ai.co',
    ...overrides,
  }) as AssembledContext;

describe('parsePlannedVideoPrompt', () => {
  it('reads the prompt from a JSON reply, even inside prose or fences', () => {
    expect(
      parsePlannedVideoPrompt('```json\n{"prompt": "A lighthouse at dusk, slow dolly in."}\n```'),
    ).toBe('A lighthouse at dusk, slow dolly in.');
  });

  it.each(['no json here', '{"prompt": "short"}', '{"other": "a long enough sentence here"}', '{'])(
    'rejects %j so the caller falls back to the user words',
    (raw) => {
      expect(parsePlannedVideoPrompt(raw)).toBeNull();
    },
  );

  it('rejects a prompt longer than the planned-prompt ceiling', () => {
    expect(parsePlannedVideoPrompt(JSON.stringify({ prompt: 'x'.repeat(1_300) }))).toBeNull();
  });
});

describe('boundVideoPrompt', () => {
  it('trims and cuts to what image-service accepts', () => {
    expect(boundVideoPrompt('  hi  ')).toBe('hi');
    expect(boundVideoPrompt('y'.repeat(5_000))).toHaveLength(4_000);
  });
});

describe('buildVideoPlannerPrompt', () => {
  it('always carries the request and the shot-writing rules', () => {
    const prompt = buildVideoPlannerPrompt('a video of a rocket', contextWith());

    expect(prompt).toContain('Video request:\na video of a rocket');
    expect(prompt).toContain('ONE JSON object');
    expect(prompt).not.toContain('Background:');
  });

  it('adds the platform background only when the request is about the app', () => {
    const about = buildVideoPlannerPrompt('generate a video about claw ai', contextWith());
    const unrelated = buildVideoPlannerPrompt('generate a video about the ocean', contextWith());

    expect(about).toContain('Background:');
    expect(about).toContain('PLATFORM AWARENESS');
    expect(about).toContain('https://claw-ai.co');
    expect(unrelated).not.toContain('PLATFORM AWARENESS');
  });

  it('adds page facts research read, and the recent conversation without repeating the request', () => {
    const prompt = buildVideoPlannerPrompt(
      'make a video from that page',
      contextWith({
        researchEvidence: [
          { title: 'Home', url: 'https://claw-ai.co', snippet: 'Every AI, one workspace' },
        ] as never,
        threadMessages: [
          message('USER', 'we are building a workspace app'),
          message('ASSISTANT', 'Sounds great.'),
          message('USER', 'make a video from that page'),
        ],
      }),
    );

    expect(prompt).toContain('- Home: Every AI, one workspace');
    expect(prompt).toContain('User: we are building a workspace app');
    expect(prompt).toContain('Assistant: Sounds great.');
    expect(prompt.match(/make a video from that page/g)).toHaveLength(1);
  });
});

describe('image-to-video helpers', () => {
  it('builds a motion-only planner prompt when an image is attached', () => {
    const prompt = buildVideoPlannerPrompt('make the waves move', contextWith(), true);

    expect(prompt).toContain('image the user attached');
    expect(prompt).toContain('never describe the image itself');
    expect(prompt).toContain('Motion request:\nmake the waves move');
    expect(prompt).not.toContain('Video request:');
  });

  it('keeps the shot planner without an image', () => {
    const prompt = buildVideoPlannerPrompt('a rocket', contextWith());

    expect(prompt).toContain('Video request:\na rocket');
    expect(prompt).not.toContain('never describe the image itself');
  });

  it('picks the first image of the turn, ignoring other files', () => {
    const context = contextWith({
      fileContents: [
        { id: 'a', mimeType: 'application/pdf' },
        { id: 'b', mimeType: 'image/webp' },
        { id: 'c', mimeType: 'image/png' },
      ] as AssembledContext['fileContents'],
    });

    expect(firstSourceImageId(context)).toBe('b');
    expect(firstSourceImageId(contextWith())).toBeUndefined();
  });
});
