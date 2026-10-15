import type { ThreadCalloutKind } from '@/constants/thread-article.constants';

export type ThreadTocItem = { id: string; text: string; level: number };

/** Words the article UI shows in the reader's language. Passed in, never read from a hook. */
export type ThreadArticleLabels = {
  toc: string;
  copyLink: string;
  linkCopied: string;
  note: string;
  tip: string;
  warning: string;
};

/** The few hast fields the heading plugin reads; hast itself is not a direct dependency. */
export type ThreadHastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: ThreadHastNode[];
};

export type ThreadArticleMarkdownProps = {
  markdown: string;
  /** The page's own H1. A first `# Title` that repeats it is dropped so the page keeps one h1. */
  title?: string;
  labels: ThreadArticleLabels;
  truncatedLabel: string;
};

export type ThreadArticleBodyProps = ThreadArticleMarkdownProps & {
  toc: ThreadTocItem[];
  /** Shown above the text, e.g. "5 min read". */
  readingTimeLabel: string;
};

export type ThreadArticleTocProps = { items: ThreadTocItem[]; label: string };

export type ThreadArticleHeadingProps = {
  level: number;
  id?: string;
  labels: ThreadArticleLabels;
  children?: React.ReactNode;
};

export type ThreadHeadingCopyLinkProps = { id: string; label: string; copiedLabel: string };

export type ThreadArticleCalloutProps = {
  kind: ThreadCalloutKind;
  labels: ThreadArticleLabels;
  children?: React.ReactNode;
};
