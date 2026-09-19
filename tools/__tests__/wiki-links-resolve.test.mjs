import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The wiki/ folder is published to the GitHub wiki by publish-wiki.yml.
// GitHub wiki links are [[Link Text|Page-Name]]: text first, page second. A
// consolidation on 2026-09-19 wrote some as [[Page-Name|Text]], which links to
// a page called "Text", and left the pipe unescaped inside table rows, which
// splits the cell. Neither shows up until someone clicks the link.
const WIKI = join(import.meta.dirname, '..', '..', 'wiki');
const LINK = /\[\[([^\]]+)\]\]/gu;
const ESCAPED_PIPE = '\\|';
const INLINE_CODE = /`[^`]*`/gu;

const pageName = (file) => file.slice(0, -'.md'.length).toLowerCase();
const normalise = (name) => name.trim().replaceAll(' ', '-').toLowerCase();

function wikiLinks() {
  const files = readdirSync(WIKI).filter((file) => file.endsWith('.md'));
  const pages = new Set(files.map(pageName));
  const links = [];
  for (const file of files) {
    const lines = readFileSync(join(WIKI, file), 'utf8').split('\n');
    let inFence = false;
    lines.forEach((line, index) => {
      if (line.trimStart().startsWith('```')) inFence = !inFence;
      // Code is shown, not linked: skip fenced blocks and `inline code`.
      if (inFence) return;
      for (const match of line.replaceAll(INLINE_CODE, '').matchAll(LINK)) {
        links.push({ where: `${file}:${String(index + 1)}`, inner: match[1], line });
      }
    });
  }
  return { pages, links };
}

// In a table row the separator must be written \| or the row splits.
function splitLink(inner) {
  const separator = inner.includes(ESCAPED_PIPE) ? ESCAPED_PIPE : '|';
  const parts = inner.split(separator);
  return parts.length === 1 ? { page: parts[0] } : { text: parts[0], page: parts.at(-1) };
}

test('every wiki link points at a page that exists', () => {
  const { pages, links } = wikiLinks();
  const broken = links
    .filter(({ inner }) => {
      const { page } = splitLink(inner);
      return !/^https?:/u.test(page) && !pages.has(normalise(page));
    })
    .map(({ where, inner }) => `${where} [[${inner}]]`);
  assert.deepEqual(broken, [], `links to missing pages (text|page order?):\n${broken.join('\n')}`);
});

test('a wiki link inside a table row escapes its pipe', () => {
  const { links } = wikiLinks();
  const unescaped = links
    .filter(({ inner, line }) => line.trimStart().startsWith('|') && /(?<!\\)\|/u.test(inner))
    .map(({ where, inner }) => `${where} [[${inner}]]`);
  assert.deepEqual(unescaped, [], `unescaped pipes split these table cells:\n${unescaped.join('\n')}`);
});
