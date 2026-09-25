import {
  ARXIV_HOSTS,
  ARXIV_QUERY_TEMPLATE,
  CROSSREF_WORK_TEMPLATE,
  DOI_HOSTS,
  GITHUB_RAW_ACCEPT,
  GITHUB_README_TEMPLATE,
  GITHUB_RESERVED_OWNERS,
  HACKER_NEWS_ITEM_TEMPLATE,
  WIKIPEDIA_REST_HTML_TEMPLATE,
} from '../constants/official-api.constants';
import { OfficialApiSource } from '../enums/official-api-source.enum';
import type { OfficialApiTarget } from '../types/official-api.types';

/**
 * Maps a page URL to the official API that serves the same content, or
 * `null` when there is none. Pure — no I/O. An API answer is cheaper for the
 * site, structured, and never blocked; scraping the HTML of a page that has
 * an API is the impolite option.
 */
export function resolveOfficialApiTarget(rawUrl: string): OfficialApiTarget | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  return (
    resolveWikipedia(host, url) ??
    resolveGithub(host, url) ??
    resolveArxiv(host, url) ??
    resolveDoi(host, url) ??
    resolveHackerNews(host, url)
  );
}

function resolveWikipedia(host: string, url: URL): OfficialApiTarget | null {
  if (!host.endsWith('.wikipedia.org') || host === 'www.wikipedia.org') {
    return null;
  }
  if (!url.pathname.startsWith('/wiki/')) {
    return null;
  }
  const title = url.pathname.slice('/wiki/'.length);
  // Namespaced pages (Special:, Talk:, File:, …) are not articles.
  if (title.length === 0 || decodeURIComponent(title).includes(':')) {
    return null;
  }
  return {
    source: OfficialApiSource.WIKIPEDIA,
    apiUrl: WIKIPEDIA_REST_HTML_TEMPLATE.replace('{host}', host).replace('{title}', title),
    accept: 'text/html',
    label: decodeURIComponent(title).replaceAll('_', ' '),
  };
}

function resolveGithub(host: string, url: URL): OfficialApiTarget | null {
  if (host !== 'github.com' && host !== 'www.github.com') {
    return null;
  }
  const segments = url.pathname.split('/').filter((segment) => segment.length > 0);
  const [owner, repo] = segments;
  if (segments.length !== 2 || owner === undefined || repo === undefined) {
    return null;
  }
  if (GITHUB_RESERVED_OWNERS.has(owner.toLowerCase())) {
    return null;
  }
  const repoName = repo.replace(/\.git$/u, '');
  return {
    source: OfficialApiSource.GITHUB,
    apiUrl: GITHUB_README_TEMPLATE.replace('{owner}', owner).replace('{repo}', repoName),
    accept: GITHUB_RAW_ACCEPT,
    label: `${owner}/${repoName}`,
  };
}

function resolveArxiv(host: string, url: URL): OfficialApiTarget | null {
  if (!ARXIV_HOSTS.has(host)) {
    return null;
  }
  const match = /^\/(?:abs|pdf)\/([\w./-]+?)(?:\.pdf)?$/u.exec(url.pathname);
  const id = match?.[1];
  if (id === undefined) {
    return null;
  }
  return {
    source: OfficialApiSource.ARXIV,
    apiUrl: ARXIV_QUERY_TEMPLATE.replace('{id}', encodeURIComponent(id)),
    accept: 'application/atom+xml',
    label: `arXiv:${id}`,
  };
}

function resolveDoi(host: string, url: URL): OfficialApiTarget | null {
  if (!DOI_HOSTS.has(host)) {
    return null;
  }
  const doi = decodeURIComponent(url.pathname.slice(1));
  if (!doi.startsWith('10.')) {
    return null;
  }
  return {
    source: OfficialApiSource.CROSSREF,
    apiUrl: CROSSREF_WORK_TEMPLATE.replace('{doi}', encodeURIComponent(doi)),
    accept: 'application/json',
    label: `doi:${doi}`,
  };
}

function resolveHackerNews(host: string, url: URL): OfficialApiTarget | null {
  if (host !== 'news.ycombinator.com' || url.pathname !== '/item') {
    return null;
  }
  const id = url.searchParams.get('id');
  if (id === null || !/^\d+$/u.test(id)) {
    return null;
  }
  return {
    source: OfficialApiSource.HACKER_NEWS,
    apiUrl: HACKER_NEWS_ITEM_TEMPLATE.replace('{id}', id),
    accept: 'application/json',
    label: `HN item ${id}`,
  };
}
