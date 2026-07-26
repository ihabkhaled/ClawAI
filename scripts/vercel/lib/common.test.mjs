import assert from 'node:assert/strict';
import { test } from 'node:test';

import { escapeMarkdownTableCell } from './common.mjs';

test('escapeMarkdownTableCell prevents table-row and HTML injection', () => {
  const escaped = escapeMarkdownTableCell('first|second\n| injected <script>&');

  assert.equal(escaped, 'first&#124;second<br>&#124; injected &lt;script&gt;&amp;');
  assert.equal(escaped.includes('\n'), false);
});

test('escapeMarkdownTableCell normalizes every newline representation', () => {
  assert.equal(escapeMarkdownTableCell('a\r\nb\rc\nd'), 'a<br>b<br>c<br>d');
});
