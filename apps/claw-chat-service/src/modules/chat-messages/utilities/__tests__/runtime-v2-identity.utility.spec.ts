import { stableRuntimeV2Json } from '../runtime-v2-identity.utility';

// Redis 7.4's Lua cjson cannot distinguish an empty array from an empty
// object — `cjson.encode(cjson.decode('[]'))` is `{}` — and every runtime
// event is decoded and re-encoded inside the Lua state machine before this
// comparison runs. A tool result carrying `[]` anywhere in its payload
// therefore reached verifiedResult() as `{}` from the Redis side, while this
// function serialised the client's own copy of the same value as `[]`. The
// hashes diverged and every such result was rejected with "Runtime V2 result
// receipt does not match canonical output" — an unhandled 500 with no
// actionable message reaching the model, on a result that was otherwise
// entirely valid. The coding-agent extension's canonicalJson already treats
// an empty array as `{}` for this exact reason; this function must match it.
describe('stableRuntimeV2Json', () => {
  it('serialises an empty array the same as an empty object', () => {
    expect(stableRuntimeV2Json([])).toBe('{}');
    expect(stableRuntimeV2Json({})).toBe('{}');
  });

  it('still serialises a non-empty array as an array', () => {
    expect(stableRuntimeV2Json([1, 'a', null])).toBe('[1,"a",null]');
  });

  it('normalises an empty array nested inside an object', () => {
    expect(stableRuntimeV2Json({ entries: [], total: 0 })).toBe('{"entries":{},"total":0}');
  });

  it('sorts object keys so key order never affects the hash input', () => {
    expect(stableRuntimeV2Json({ b: 1, a: 2 })).toBe(stableRuntimeV2Json({ a: 2, b: 1 }));
  });
});
