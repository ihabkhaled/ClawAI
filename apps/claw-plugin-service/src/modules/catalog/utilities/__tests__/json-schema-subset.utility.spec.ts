import { JsonSchemaIssue } from '../../../../common/enums/json-schema-issue.enum';
import { checkJsonSchemaSubset } from '../json-schema-subset.utility';

function nested(level: number): Record<string, unknown> {
  return level === 0 ? { type: 'string' } : { items: nested(level - 1) };
}

describe('checkJsonSchemaSubset', () => {
  it('accepts a normal object schema', () => {
    expect(
      checkJsonSchemaSubset({
        type: 'object',
        properties: { a: { type: 'array', items: { type: 'string' } } },
        anyOf: [{ required: ['a'] }],
      }),
    ).toEqual([]);
  });

  it.each([null, undefined, 'x', 1, []])('rejects non-object %j', (value) => {
    expect(checkJsonSchemaSubset(value)).toEqual([JsonSchemaIssue.NOT_AN_OBJECT]);
  });

  it('flags remote and relative-file references but allows fragment references', () => {
    expect(checkJsonSchemaSubset({ $ref: '#/$defs/a' })).toEqual([]);
    expect(checkJsonSchemaSubset({ $ref: 'other.json' })).toContain(JsonSchemaIssue.REMOTE_REF);
    expect(checkJsonSchemaSubset({ $ref: 42 })).toContain(JsonSchemaIssue.REMOTE_REF);
  });

  it('counts depth over subschema keywords only', () => {
    const deepData = { type: 'object', default: { a: { b: { c: { d: { e: { f: 1 } } } } } } };
    expect(checkJsonSchemaSubset(deepData)).toEqual([]);
    expect(checkJsonSchemaSubset(nested(5))).toEqual([]);
    expect(checkJsonSchemaSubset(nested(6))).toContain(JsonSchemaIssue.TOO_DEEP);
  });

  it('follows anyOf, map and single keywords when measuring depth', () => {
    let schema: Record<string, unknown> = { type: 'string' };
    for (let level = 0; level < 3; level += 1) {
      schema = { anyOf: [{ properties: { x: { not: schema } } }] };
    }
    expect(checkJsonSchemaSubset(schema)).toContain(JsonSchemaIssue.TOO_DEEP);
  });

  it('reports a circular schema as not acceptable', () => {
    const circular: Record<string, unknown> = { type: 'object' };
    circular['self'] = circular;
    expect(checkJsonSchemaSubset(circular)).not.toEqual([]);
  });

  it('reports a BigInt value as not serialisable', () => {
    expect(checkJsonSchemaSubset({ type: 'object', default: 10n })).toEqual([
      JsonSchemaIssue.NOT_SERIALISABLE,
    ]);
  });

  describe('hostile text', () => {
    it('flags a hostile string value at any depth', () => {
      expect(
        checkJsonSchemaSubset({
          type: 'object',
          properties: { q: { type: 'string', description: 'a\u202Eb' } },
        }),
      ).toContain(JsonSchemaIssue.HOSTILE_TEXT);
    });

    it('flags a hostile value inside an array such as enum', () => {
      expect(checkJsonSchemaSubset({ type: 'object', enum: ['ok', 'x\u{E0041}y'] })).toContain(
        JsonSchemaIssue.HOSTILE_TEXT,
      );
    });

    it('flags a hostile property key', () => {
      expect(
        checkJsonSchemaSubset({ type: 'object', properties: { 'na\u200Bme': { type: 'string' } } }),
      ).toContain(JsonSchemaIssue.HOSTILE_TEXT);
    });

    it('allows tabs and newlines in values but rejects them in keys', () => {
      expect(checkJsonSchemaSubset({ type: 'object', description: 'a\nb\tc' })).toEqual([]);
      expect(checkJsonSchemaSubset({ type: 'object', 'a\nb': 1 })).toContain(
        JsonSchemaIssue.HOSTILE_TEXT,
      );
    });

    it('accepts ordinary multilingual text and the Persian ZWNJ', () => {
      expect(
        checkJsonSchemaSubset({ type: 'object', description: 'Météo 天気 آب\u200Cوهوا' }),
      ).toEqual([]);
    });
  });
});
