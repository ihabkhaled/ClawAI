import {
  parseRuntimeV2ModelOutput,
  repairUnescapedControlCharacters,
} from '../runtime-v2-model-output.utility';

// Writing a file means putting source code in a JSON string, and models emit
// the newlines in that code literally instead of as an escape. JSON forbids a
// raw control character inside a string, so a request that was otherwise
// perfect — right tool, right operation, right transaction shape — was reported
// as a tool object the model "did not finish", and a schema edit was lost.
describe('raw control characters inside a tool request', () => {
  it('escapes a literal newline inside a string', () => {
    expect(repairUnescapedControlCharacters('{"a":"one\ntwo"}')).toBe('{"a":"one\\ntwo"}');
  });

  it('leaves an already-escaped document byte-identical', () => {
    const valid = '{"a":"one\\ntwo","b":[1,2]}';

    expect(repairUnescapedControlCharacters(valid)).toBe(valid);
  });

  it('never rewrites whitespace that sits outside a string', () => {
    const pretty = '{\n  "a": 1\n}';

    expect(repairUnescapedControlCharacters(pretty)).toBe(pretty);
  });

  it('keeps an escaped quote from ending the string early', () => {
    const text = '{"a":"say \\"hi\\"\nthen go"}';

    expect(JSON.parse(repairUnescapedControlCharacters(text))).toEqual({ a: 'say "hi"\nthen go' });
  });

  it('parses a patch whose hunks carry real newlines', () => {
    const request =
      '{"kind":"tool","toolName":"workspace.files","toolVersion":"2.0.0",' +
      '"operation":"patch","arguments":{"transaction":{"transactionId":"t1",' +
      '"summary":"add model","operations":[{"kind":"patch","rootKey":"workspace-1",' +
      '"path":"schema.prisma","beforeHash":"sha256:abc","hunks":[{"before":"a\nb",' +
      '"after":"a\nb\nmodel X {\n  id String\n}"}]}]}},"targetId":"target:workspace"}';

    expect(parseRuntimeV2ModelOutput(request).kind).toBe('tool');
  });

  it('still answers prose that merely starts with a brace', () => {
    expect(parseRuntimeV2ModelOutput('{ not really json at all').kind).toBe('final');
  });
});
