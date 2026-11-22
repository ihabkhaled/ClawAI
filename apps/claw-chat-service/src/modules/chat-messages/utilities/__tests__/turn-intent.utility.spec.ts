import type { TurnIntentPayload } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import type { AssembledContext } from '../../types/context.types';
import { fileWriterOptionsFor } from '../file-writer.utility';
import {
  authoritativeTurnIntent,
  buildTurnIntentMetaPart,
  intentFileFormat,
  previousTurnKind,
  turnIntentField,
  withTurnIntent,
} from '../turn-intent.utility';

const intent = (over: Partial<TurnIntentPayload> = {}): TurnIntentPayload => ({
  kind: 'TEXT',
  confidence: 0.9,
  source: 'MODEL',
  ...over,
});

describe('turnIntentField', () => {
  it('reads a well-formed intent off message.routed', () => {
    expect(
      turnIntentField({
        kind: 'FILE',
        fileFormat: 'pdf',
        confidence: 0.8,
        source: 'MODEL',
        pickOverridden: { provider: 'IMAGE_GEMINI', model: 'nano-banana' },
      }),
    ).toEqual({
      turnIntent: {
        kind: 'FILE',
        fileFormat: 'pdf',
        confidence: 0.8,
        source: 'MODEL',
        pickOverridden: { provider: 'IMAGE_GEMINI', model: 'nano-banana' },
      },
    });
  });

  it.each([
    undefined,
    null,
    'TEXT',
    { kind: 'SING', confidence: 0.9, source: 'MODEL' },
    { kind: 'TEXT', confidence: 2, source: 'MODEL' },
    { kind: 'TEXT', confidence: 0.9, source: 'GUESS' },
    { kind: 'TEXT', source: 'MODEL' },
  ])('ignores %j (an older publisher or a malformed field keeps legacy rules)', (raw) => {
    expect(turnIntentField(raw)).toEqual({});
  });
});

describe('authoritativeTurnIntent', () => {
  it('trusts only a MODEL intent', () => {
    expect(authoritativeTurnIntent(intent())).toEqual(intent());
    expect(authoritativeTurnIntent(intent({ source: 'HEURISTIC' }))).toBeUndefined();
    expect(authoritativeTurnIntent(undefined)).toBeUndefined();
  });
});

describe('withTurnIntent', () => {
  it('puts the intent on the context and leaves it untouched without one', () => {
    const context = { userId: 'u' } as unknown as AssembledContext;
    expect(withTurnIntent(context, undefined)).toBe(context);
    expect(withTurnIntent(context, intent()).turnIntent).toEqual(intent());
  });
});

describe('intentFileFormat / fileWriterOptionsFor', () => {
  it('takes a known format from a MODEL FILE intent', () => {
    expect(intentFileFormat(intent({ kind: 'FILE', fileFormat: 'pdf' }))).toBe('PDF');
    expect(intentFileFormat(intent({ kind: 'FILE', fileFormat: '.docx' }))).toBe('DOCX');
    expect(
      fileWriterOptionsFor({
        routingMode: 'AUTO',
        turnIntent: intent({ kind: 'FILE', fileFormat: 'xlsx' }),
      }),
    ).toEqual({ format: 'XLSX' });
  });

  it('ignores an unknown format, a TEXT intent and a HEURISTIC intent', () => {
    expect(intentFileFormat(intent({ kind: 'FILE', fileFormat: 'exe' }))).toBeUndefined();
    expect(intentFileFormat(intent({ kind: 'TEXT', fileFormat: 'pdf' }))).toBeUndefined();
    expect(
      intentFileFormat(intent({ kind: 'FILE', fileFormat: 'pdf', source: 'HEURISTIC' })),
    ).toBeUndefined();
    expect(fileWriterOptionsFor({ routingMode: 'AUTO' })).toEqual({});
  });
});

describe('buildTurnIntentMetaPart', () => {
  it('persists kind, source and confidence as `turnIntent`', () => {
    expect(buildTurnIntentMetaPart(intent({ kind: 'VIDEO', fileFormat: 'pdf' }))).toEqual({
      turnIntent: { kind: 'VIDEO', source: 'MODEL', confidence: 0.9 },
    });
  });

  it('persists the replaced pick as `intentPickOverridden`', () => {
    expect(
      buildTurnIntentMetaPart(
        intent({ pickOverridden: { provider: 'IMAGE_GEMINI', model: 'nano-banana' } }),
      ),
    ).toEqual({
      turnIntent: { kind: 'TEXT', source: 'MODEL', confidence: 0.9 },
      intentPickOverridden: { provider: 'IMAGE_GEMINI', model: 'nano-banana' },
    });
  });

  it('adds nothing without an intent', () => {
    expect(buildTurnIntentMetaPart(undefined)).toEqual({});
  });
});

describe('previousTurnKind', () => {
  const assistant = (metadata: unknown): { role: string; metadata: unknown } => ({
    role: 'ASSISTANT',
    metadata,
  });
  const user = { role: 'USER', metadata: null };

  it.each([
    [{ type: 'image_generation', generationId: 'g' }, 'IMAGE'],
    [{ type: 'video_generation', generationId: 'g' }, 'VIDEO'],
    [{ type: 'file_generation', generationId: 'g' }, 'FILE'],
    [{ mediaGenerations: [{ kind: 'audio', id: 'a' }] }, 'AUDIO'],
    [
      {
        mediaGenerations: [
          { kind: 'audio', id: 'a' },
          { kind: 'image', id: 'i' },
        ],
      },
      'IMAGE',
    ],
    [{ mediaGenerations: [{ kind: 'video', id: 'v' }] }, 'VIDEO'],
    [{ respondedProvider: 'GEMINI' }, 'TEXT'],
    [{ type: 'file_limit' }, 'TEXT'],
    [null, 'TEXT'],
  ])('reads %j as %s', (metadata, expected) => {
    expect(previousTurnKind([user, assistant(metadata), user])).toBe(expected);
  });

  it('uses the LATEST assistant answer and is TEXT on a new thread', () => {
    expect(
      previousTurnKind([
        assistant({ type: 'image_generation' }),
        user,
        assistant({ respondedProvider: 'GEMINI' }),
        user,
      ]),
    ).toBe('TEXT');
    expect(previousTurnKind([user])).toBe('TEXT');
    expect(previousTurnKind([])).toBe('TEXT');
  });
});
