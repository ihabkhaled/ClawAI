import { OfficialApiSource } from '../enums/official-api-source.enum';
import { extractPageContent } from './page-content.utility';
import type {
  CrossrefWorkResponse,
  HackerNewsItem,
  OfficialApiDocument,
  OfficialApiTarget,
} from '../types/official-api.types';

/**
 * Turns an official API's response body into readable Markdown. Throws when
 * the body is not the document we asked for (empty arXiv feed, a null HN
 * item), so the orchestrator moves on to the next strategy instead of
 * serving an empty page as a success.
 */
export function formatOfficialApiDocument(
  target: OfficialApiTarget,
  body: string,
  pageUrl: string,
): OfficialApiDocument {
  switch (target.source) {
    case OfficialApiSource.WIKIPEDIA: {
      const page = extractPageContent(body, pageUrl);
      return { title: page.title ?? target.label, content: page.content, links: page.links };
    }
    case OfficialApiSource.GITHUB: {
      return { title: target.label, content: `# ${target.label}\n\n${body.trim()}`, links: [] };
    }
    case OfficialApiSource.ARXIV: {
      return formatArxiv(body, target);
    }
    case OfficialApiSource.CROSSREF: {
      return formatCrossref(body, target);
    }
    case OfficialApiSource.HACKER_NEWS: {
      return formatHackerNews(body, pageUrl);
    }
  }
}

function formatArxiv(xml: string, target: OfficialApiTarget): OfficialApiDocument {
  const entry = /<entry>([\s\S]*?)<\/entry>/u.exec(xml)?.[1];
  const title = entry === undefined ? null : readXmlTag(entry, 'title');
  if (entry === undefined || title === null) {
    throw new Error(`arXiv returned no entry for ${target.label}`);
  }
  const summary = readXmlTag(entry, 'summary') ?? '';
  const published = readXmlTag(entry, 'published') ?? 'unknown date';
  const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/gu)]
    .map((match) => collapse(match[1] ?? ''))
    .filter((name) => name.length > 0);
  const content = [
    `# ${title}`,
    `${target.label} · published ${published}`,
    authors.length > 0 ? `Authors: ${authors.join(', ')}` : '',
    '## Abstract',
    summary,
  ]
    .filter((line) => line.length > 0)
    .join('\n\n');
  return { title, content, links: [] };
}

function formatCrossref(json: string, target: OfficialApiTarget): OfficialApiDocument {
  const work = (JSON.parse(json) as CrossrefWorkResponse).message;
  const title = work?.title?.[0] ?? null;
  if (work === undefined || title === null) {
    throw new Error(`Crossref returned no work for ${target.label}`);
  }
  const authors = (work.author ?? [])
    .map((author) => [author.given, author.family].filter((part) => part !== undefined).join(' '))
    .filter((name) => name.length > 0);
  const year = work.published?.['date-parts']?.[0]?.[0];
  const abstract = collapse((work.abstract ?? '').replaceAll(/<[^>]+>/gu, ' '));
  const content = [
    `# ${title}`,
    `${target.label}${year === undefined ? '' : ` · ${String(year)}`}${
      work['container-title']?.[0] === undefined ? '' : ` · ${work['container-title'][0]}`
    }`,
    authors.length > 0 ? `Authors: ${authors.join(', ')}` : '',
    abstract.length > 0 ? `## Abstract\n\n${abstract}` : 'No abstract in the Crossref record.',
  ]
    .filter((line) => line.length > 0)
    .join('\n\n');
  return { title, content, links: work.URL === undefined ? [] : [work.URL] };
}

function formatHackerNews(json: string, pageUrl: string): OfficialApiDocument {
  const item = JSON.parse(json) as HackerNewsItem | null;
  if (item?.id === undefined) {
    throw new Error(`Hacker News has no item at ${pageUrl}`);
  }
  const text = extractPageContent(`<html><body>${item.text ?? ''}</body></html>`, pageUrl).content;
  const title = item.title ?? `HN ${item.type ?? 'item'} ${String(item.id)}`;
  const content = [
    `# ${title}`,
    `by ${item.by ?? 'unknown'} · ${String(item.score ?? 0)} points · ${String(item.descendants ?? 0)} comments`,
    item.url === undefined ? '' : `Link: ${item.url}`,
    text,
  ]
    .filter((line) => line.length > 0)
    .join('\n\n');
  return { title, content, links: item.url === undefined ? [] : [item.url] };
}

function readXmlTag(xml: string, tag: string): string | null {
  const value = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'u').exec(xml)?.[1];
  return value === undefined ? null : collapse(value);
}

function collapse(value: string): string {
  return value.replaceAll(/\s+/gu, ' ').trim();
}
