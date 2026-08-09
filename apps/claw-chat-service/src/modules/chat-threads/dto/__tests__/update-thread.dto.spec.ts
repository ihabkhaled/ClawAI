import { updateThreadSchema } from '../update-thread.dto';

describe('updateThreadSchema critic settings', () => {
  it('accepts a critic model when judge and critic are enabled', () => {
    expect(
      updateThreadSchema.parse({
        judgeEnabled: true,
        criticEnabled: true,
        criticModel: 'ANTHROPIC:claude-sonnet-4',
      }),
    ).toMatchObject({ criticEnabled: true, criticModel: 'ANTHROPIC:claude-sonnet-4' });
  });

  it('rejects critic without judge', () => {
    expect(
      updateThreadSchema.safeParse({
        judgeEnabled: false,
        criticEnabled: true,
        criticModel: 'ANTHROPIC:claude-sonnet-4',
      }).success,
    ).toBe(false);
  });

  it('rejects critic without a selected model', () => {
    expect(updateThreadSchema.safeParse({ judgeEnabled: true, criticEnabled: true }).success).toBe(
      false,
    );
  });
});
