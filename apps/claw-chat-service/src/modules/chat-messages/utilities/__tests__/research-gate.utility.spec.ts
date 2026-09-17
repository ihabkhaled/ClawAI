import { parseResearchGateVerdict } from '../research-gate.utility';

describe('parseResearchGateVerdict', () => {
  it('reads a clean verdict', () => {
    expect(parseResearchGateVerdict('{"needsWeb":true,"reason":"asks for today\'s news"}')).toEqual({
      needsWeb: true,
      reason: "asks for today's news",
    });
  });

  it('finds the object inside chatter the model added anyway', () => {
    const raw = 'Sure!\n```json\n{"needsWeb":false,"reason":"greeting"}\n```';
    expect(parseResearchGateVerdict(raw).needsWeb).toBe(false);
  });

  it.each([
    ['not json at all', 'I think you should search the web!'],
    ['truncated json', '{"needsWeb": tr'],
    ['empty', ''],
  ])('fails CLOSED on %s', (_label, raw) => {
    // This gate exists to REDUCE lookups. One that searches whenever the
    // classifier misbehaves causes the exact problem it was added to fix.
    expect(parseResearchGateVerdict(raw).needsWeb).toBe(false);
  });

  it('treats a non-boolean needsWeb as no', () => {
    // "true" the string, 1, null — none of these are a decision to search.
    expect(parseResearchGateVerdict('{"needsWeb":"true"}').needsWeb).toBe(false);
    expect(parseResearchGateVerdict('{"needsWeb":1}').needsWeb).toBe(false);
  });

  it('always carries a reason so a wrong verdict can be traced', () => {
    expect(parseResearchGateVerdict('{"needsWeb":true}').reason).toBe('no reason given');
    expect(parseResearchGateVerdict('garbage').reason).toBe('unparseable');
  });
});
