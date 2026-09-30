import { RoutingMode } from '../../../../generated/prisma';
import { regenerateMessageSchema } from '../../dto/regenerate-message.dto';
import { resolveRegenerateRouting } from '../regenerate-routing.utility';

const pinned = { preferredProvider: 'OPENAI', preferredModel: 'gpt-5' };
const unpinned = { preferredProvider: null, preferredModel: null };

describe('resolveRegenerateRouting', () => {
  it('keeps the old rule with no choice: the pinned model', () => {
    expect(resolveRegenerateRouting({}, pinned, RoutingMode.AUTO)).toEqual({
      routingMode: RoutingMode.MANUAL_MODEL,
      forcedProvider: 'OPENAI',
      forcedModel: 'gpt-5',
    });
  });

  it('keeps the old rule with no choice and no pin: the original mode', () => {
    expect(resolveRegenerateRouting({}, unpinned, RoutingMode.LOCAL_ONLY)).toEqual({
      routingMode: RoutingMode.LOCAL_ONLY,
      forcedProvider: undefined,
      forcedModel: undefined,
    });
  });

  it('re-routes from scratch on AUTO, ignoring the pin', () => {
    expect(
      resolveRegenerateRouting({ routingMode: RoutingMode.AUTO }, pinned, RoutingMode.MANUAL_MODEL),
    ).toEqual({ routingMode: RoutingMode.AUTO, forcedProvider: undefined, forcedModel: undefined });
  });

  it('forces the chosen model on a manual pick', () => {
    const dto = {
      routingMode: RoutingMode.MANUAL_MODEL,
      provider: 'ANTHROPIC',
      model: 'claude-opus-5',
    };

    expect(resolveRegenerateRouting(dto, pinned, RoutingMode.AUTO)).toEqual({
      routingMode: RoutingMode.MANUAL_MODEL,
      forcedProvider: 'ANTHROPIC',
      forcedModel: 'claude-opus-5',
    });
  });
});

describe('regenerateMessageSchema', () => {
  it('accepts an empty body', () => {
    expect(regenerateMessageSchema.safeParse({}).success).toBe(true);
  });

  it('accepts NO body at all — Express leaves it undefined', () => {
    expect(regenerateMessageSchema.safeParse(undefined)).toMatchObject({ success: true, data: {} });
  });

  it('refuses a manual pick missing half the model id', () => {
    expect(
      regenerateMessageSchema.safeParse({
        routingMode: RoutingMode.MANUAL_MODEL,
        provider: 'OPENAI',
      }).success,
    ).toBe(false);
  });

  it('refuses a routing mode regenerate does not offer', () => {
    expect(regenerateMessageSchema.safeParse({ routingMode: RoutingMode.LOCAL_ONLY }).success).toBe(
      false,
    );
  });
});
