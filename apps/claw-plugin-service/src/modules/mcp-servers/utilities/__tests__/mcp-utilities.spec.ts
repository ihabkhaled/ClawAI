import { AuthKind } from '../../../../common/enums/auth-kind.enum';
import { type SnapshotTool } from '../../types/mcp-tool-snapshot.types';
import { buildCredentialHeaders, resolveCredentialHeaderName } from '../credential-header.utility';
import { diffToolSnapshots, isEmptyDiff } from '../diff-tool-snapshots.utility';
import { extractJsonRpcResponse } from '../extract-json-rpc-response.utility';
import { parseSseEvents } from '../parse-sse-events.utility';
import { stripHostileText } from '../strip-hostile-text.utility';
import { toLocalToolName } from '../to-local-tool-name.utility';

describe('parseSseEvents', () => {
  it('returns one payload per event and joins multi-line data', () => {
    expect(parseSseEvents('event: message\ndata: {"a":1}\n\ndata: l1\ndata: l2\n\n')).toEqual([
      '{"a":1}',
      'l1\nl2',
    ]);
  });

  it('handles CRLF and CR line ends', () => {
    expect(parseSseEvents('data: a\r\n\r\ndata: b\r\rdata: c\r\n\r\n')).toEqual(['a', 'b', 'c']);
  });

  it('keeps a final event the server never terminated', () => {
    expect(parseSseEvents('data: tail')).toEqual(['tail']);
  });

  it('ignores comments, ids, retry hints and event names', () => {
    expect(parseSseEvents(': ping\nid: 4\nretry: 100\nevent: x\ndata: ok\n\n')).toEqual(['ok']);
  });

  it('returns nothing for a body with no data field', () => {
    expect(parseSseEvents('event: ping\n\n')).toEqual([]);
    expect(parseSseEvents('')).toEqual([]);
  });
});

describe('extractJsonRpcResponse', () => {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 3, result: { ok: true } });

  it('reads a JSON body', () => {
    expect(extractJsonRpcResponse('application/json; charset=utf-8', body, 3)?.result).toEqual({
      ok: true,
    });
  });

  it('picks the response with the matching id out of a stream that also carries notifications', () => {
    const stream = [
      `data: ${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/progress', params: {} })}`,
      '',
      `data: ${JSON.stringify({ jsonrpc: '2.0', id: 9, result: 'other' })}`,
      '',
      `data: ${body}`,
      '',
      '',
    ].join('\n');

    expect(extractJsonRpcResponse('text/event-stream', stream, 3)?.result).toEqual({ ok: true });
  });

  it('picks the matching response out of a batch array', () => {
    const batch = JSON.stringify([{ jsonrpc: '2.0', id: 1, result: 'a' }, JSON.parse(body)]);

    expect(extractJsonRpcResponse('application/json', batch, 3)?.result).toEqual({ ok: true });
  });

  it.each([
    ['another id', body, 4],
    ['not json', 'nope', 3],
    ['the wrong jsonrpc version', JSON.stringify({ jsonrpc: '1.0', id: 3, result: 1 }), 3],
    ['no id', JSON.stringify({ jsonrpc: '2.0', result: 1 }), 3],
    ['a string', '"text"', 3],
  ])('returns null for %s', (_name, text, id) => {
    expect(extractJsonRpcResponse('application/json', text, id)).toBeNull();
  });

  it('returns null while a stream has not delivered the response yet', () => {
    expect(extractJsonRpcResponse('text/event-stream', 'data: {"jsonrpc":"2.0"', 3)).toBeNull();
  });
});

describe('toLocalToolName', () => {
  it.each([
    ['create_issue', 'create_issue'],
    ['Create-Issue', 'create_issue'],
    ['__x__', 'x'],
    ['a--b..c', 'a_b_c'],
    ['git.commit', 'git_commit'],
    ['_lead', 'lead'],
  ])('maps %s to %s', (input, expected) => {
    expect(toLocalToolName(input)).toBe(expected);
  });

  it('cuts at 40 characters without leaving a trailing underscore', () => {
    const name = toLocalToolName(`${'a'.repeat(39)}-b`);

    expect(name).toBe('a'.repeat(39));
  });

  it.each(['', '---', '___', '....'])('returns null when nothing usable is left in %j', (input) => {
    expect(toLocalToolName(input)).toBeNull();
  });
});

describe('diffToolSnapshots', () => {
  const fresh = (name: string, schemaHash: string): SnapshotTool => ({
    name,
    localName: name,
    description: '',
    inputSchema: {},
    schemaHash,
  });

  it('reports added, removed and changed tools', () => {
    const diff = diffToolSnapshots(
      [
        { name: 'keep', localName: 'keep', schemaHash: 'h1' },
        { name: 'gone', localName: 'gone', schemaHash: 'h2' },
        { name: 'edit', localName: 'edit', schemaHash: 'h3' },
      ],
      [fresh('keep', 'h1'), fresh('edit', 'h3x'), fresh('new', 'h4')],
    );

    expect(diff).toEqual({ added: ['new'], removed: ['gone'], changed: ['edit'] });
    expect(isEmptyDiff(diff)).toBe(false);
  });

  it('is empty when nothing differs', () => {
    expect(
      isEmptyDiff(
        diffToolSnapshots([{ name: 'a', localName: 'a', schemaHash: 'h' }], [fresh('a', 'h')]),
      ),
    ).toBe(true);
  });
});

describe('credential headers', () => {
  it.each([
    [AuthKind.API_KEY, undefined, 'X-API-Key'],
    [AuthKind.API_KEY, 'Api-Key', 'Api-Key'],
    [AuthKind.API_KEY, 'X-Custom-Token', 'X-Custom-Token'],
    [AuthKind.API_KEY, 'Authorization', 'Authorization'],
    [AuthKind.BEARER_TOKEN, undefined, 'Authorization'],
    [AuthKind.BEARER_TOKEN, 'Authorization', 'Authorization'],
  ])('resolves %s with %s to %s', (kind, requested, expected) => {
    expect(resolveCredentialHeaderName(kind, requested)).toBe(expected);
  });

  it.each([
    [AuthKind.API_KEY, 'Host'],
    [AuthKind.API_KEY, 'Cookie'],
    [AuthKind.API_KEY, 'Content-Type'],
    [AuthKind.API_KEY, 'Accept'],
    [AuthKind.API_KEY, 'Mcp-Session-Id'],
    [AuthKind.API_KEY, 'Content-Length'],
    [AuthKind.API_KEY, 'Transfer-Encoding'],
    [AuthKind.API_KEY, 'Proxy-Authorization'],
    [AuthKind.API_KEY, 'X-'],
    [AuthKind.API_KEY, 'User-Agent'],
    [AuthKind.BEARER_TOKEN, 'X-API-Key'],
    [AuthKind.NONE, 'X-API-Key'],
  ])('refuses %s in header %s', (kind, requested) => {
    expect(resolveCredentialHeaderName(kind, requested)).toBeNull();
  });

  it('builds the header for each kind', () => {
    expect(buildCredentialHeaders(AuthKind.API_KEY, 'X-API-Key', 'k')).toEqual({
      'X-API-Key': 'k',
    });
    expect(buildCredentialHeaders(AuthKind.BEARER_TOKEN, 'Authorization', 'tok')).toEqual({
      Authorization: 'Bearer tok',
    });
    expect(buildCredentialHeaders(AuthKind.NONE, '', 'x')).toEqual({});
  });
});

describe('stripHostileText', () => {
  it('removes controls, zero-width and bidi characters and keeps ordinary text', () => {
    const dirty = `a${String.fromCodePoint(0x200b)}b${String.fromCodePoint(0x202e)}c${String.fromCodePoint(7)}d`;

    expect(stripHostileText(dirty, false)).toBe('abcd');
  });

  it('keeps line breaks only when asked', () => {
    expect(stripHostileText('a\nb\tc', true)).toBe('a\nb\tc');
    expect(stripHostileText('a\nb\tc', false)).toBe('abc');
  });

  it('keeps Persian ZWNJ and normalises to NFC', () => {
    const zwnj = String.fromCodePoint(0x200c);

    expect(stripHostileText(`می${zwnj}خواهم`, false)).toContain(zwnj);
    expect(stripHostileText(`e${String.fromCodePoint(0x301)}`, false)).toBe(
      String.fromCodePoint(0xe9),
    );
  });
});
