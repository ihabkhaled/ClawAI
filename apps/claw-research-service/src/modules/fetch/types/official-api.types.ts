import type { OfficialApiSource } from '../enums/official-api-source.enum';

/** Where the official-API strategy will read a URL's content from. */
export type OfficialApiTarget = {
  source: OfficialApiSource;
  apiUrl: string;
  accept: string;
  /** A human label for the resource (repo name, arXiv id, DOI, …). */
  label: string;
};

/** The formatted page an official API produced. */
export type OfficialApiDocument = {
  title: string | null;
  content: string;
  links: string[];
};

/** Crossref `/works/{doi}` — only the fields we read. */
export type CrossrefWorkResponse = {
  message?: {
    title?: string[];
    abstract?: string;
    author?: Array<{ given?: string; family?: string }>;
    'container-title'?: string[];
    published?: { 'date-parts'?: number[][] };
    URL?: string;
  };
};

/** Hacker News Firebase item — only the fields we read. */
export type HackerNewsItem = {
  id?: number;
  type?: string;
  by?: string;
  title?: string;
  url?: string;
  text?: string;
  score?: number;
  descendants?: number;
  time?: number;
};
