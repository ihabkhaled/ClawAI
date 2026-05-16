import { resolveChainPayload } from '../chain-placeholder-resolver.utility';
import type { ChainStepOutputs } from '../../types/chain.types';

const outputs: ChainStepOutputs = {
  'create-ticket': {
    externalId: 'PROJ-42',
    url: 'https://jira.example.com/browse/PROJ-42',
    metadata: { priority: 'High', nested: { deep: 'value' } },
  },
  'post-slack': {
    externalId: 'msg-1',
    ts: 1700000000,
  },
};

describe('resolveChainPayload', () => {
  it('resolves a whole-string token type-preservingly', () => {
    const { payload, unresolved } = resolveChainPayload(
      { ts: '{{steps.post-slack.output.ts}}' },
      outputs,
    );
    expect(payload['ts']).toBe(1700000000); // stays a number
    expect(unresolved).toEqual([]);
  });

  it('resolves a whole-string token to a nested object', () => {
    const { payload } = resolveChainPayload(
      { meta: '{{steps.create-ticket.output.metadata}}' },
      outputs,
    );
    expect(payload['meta']).toEqual({ priority: 'High', nested: { deep: 'value' } });
  });

  it('resolves deep dotted paths', () => {
    const { payload } = resolveChainPayload(
      { d: '{{steps.create-ticket.output.metadata.nested.deep}}' },
      outputs,
    );
    expect(payload['d']).toBe('value');
  });

  it('resolves embedded tokens as strings', () => {
    const { payload } = resolveChainPayload(
      { body: 'Ticket {{steps.create-ticket.output.externalId}} is ready' },
      outputs,
    );
    expect(payload['body']).toBe('Ticket PROJ-42 is ready');
  });

  it('stringifies non-string embedded values', () => {
    const { payload } = resolveChainPayload(
      { note: 'sent at {{steps.post-slack.output.ts}}' },
      outputs,
    );
    expect(payload['note']).toBe('sent at 1700000000');
  });

  it('resolves the whole output object with {{steps.id.output}}', () => {
    const { payload } = resolveChainPayload(
      { everything: '{{steps.post-slack.output}}' },
      outputs,
    );
    expect(payload['everything']).toEqual({ externalId: 'msg-1', ts: 1700000000 });
  });

  it('walks nested arrays and objects in the payload', () => {
    const { payload } = resolveChainPayload(
      {
        items: ['{{steps.create-ticket.output.externalId}}', 'static'],
        nested: { ref: '{{steps.post-slack.output.externalId}}' },
      },
      outputs,
    );
    expect(payload['items']).toEqual(['PROJ-42', 'static']);
    expect(payload['nested']).toEqual({ ref: 'msg-1' });
  });

  it('leaves unknown stepId tokens in place and reports them', () => {
    const { payload, unresolved } = resolveChainPayload(
      { x: '{{steps.does-not-exist.output.foo}}' },
      outputs,
    );
    expect(payload['x']).toBe('{{steps.does-not-exist.output.foo}}');
    expect(unresolved).toEqual(['{{steps.does-not-exist.output.foo}}']);
  });

  it('leaves missing-path tokens in place and reports them', () => {
    const { payload, unresolved } = resolveChainPayload(
      { x: '{{steps.create-ticket.output.nonexistent}}' },
      outputs,
    );
    expect(payload['x']).toBe('{{steps.create-ticket.output.nonexistent}}');
    expect(unresolved).toHaveLength(1);
  });

  it('rejects prototype-pollution path segments', () => {
    const { payload, unresolved } = resolveChainPayload(
      { x: '{{steps.create-ticket.output.__proto__.polluted}}' },
      outputs,
    );
    // __proto__ segment → undefined → token left as-is + reported.
    expect(payload['x']).toBe('{{steps.create-ticket.output.__proto__.polluted}}');
    expect(unresolved).toHaveLength(1);
  });

  it('leaves payloads with no tokens untouched', () => {
    const input = { a: 1, b: 'plain', c: { d: true } };
    const { payload, unresolved } = resolveChainPayload(input, outputs);
    expect(payload).toEqual(input);
    expect(unresolved).toEqual([]);
  });

  it('handles multiple embedded tokens in one string', () => {
    const { payload } = resolveChainPayload(
      {
        msg: '{{steps.create-ticket.output.externalId}} → {{steps.post-slack.output.externalId}}',
      },
      outputs,
    );
    expect(payload['msg']).toBe('PROJ-42 → msg-1');
  });
});
