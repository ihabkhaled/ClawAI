import { THREAD_CALLOUT_WORDS, ThreadCalloutKind } from '@/constants/thread-article.constants';
import type { ThreadHastNode } from '@/types/thread-article.types';

function firstElement(node: ThreadHastNode | undefined, tag: string): ThreadHastNode | undefined {
  return (node?.children ?? []).find((child) => child.type === 'element' && child.tagName === tag);
}

function normalise(label: string): string {
  return label
    .normalize('NFKC')
    .replaceAll(/[:：\s]+$/gu, '')
    .toLowerCase();
}

/**
 * The callout kind of a blockquote written as `> **Note:** ...`: its first paragraph starts with a
 * bold label. Null when the quote is an ordinary quotation. An unknown label is a plain Note.
 */
export function calloutKindOf(blockquote: ThreadHastNode | undefined): ThreadCalloutKind | null {
  const paragraph = firstElement(blockquote, 'p');
  const strong = firstElement(paragraph, 'strong');
  const first = (paragraph?.children ?? []).find(
    (child) => child.type !== 'text' || (child.value ?? '').trim() !== '',
  );
  if (!strong || first !== strong) {
    return null;
  }
  const label = normalise((strong.children ?? []).map((child) => child.value ?? '').join(''));
  if (label === '') {
    return null;
  }
  const kinds = Object.values(ThreadCalloutKind);
  const matched = kinds.find((kind) => THREAD_CALLOUT_WORDS[kind].includes(label));
  const labelled = (strong.children ?? [])
    .map((child) => child.value ?? '')
    .join('')
    .trim()
    .endsWith(':');
  const colonAfter = /^[:：]/u.test(
    (paragraph?.children ?? [])[(paragraph?.children ?? []).indexOf(strong) + 1]?.value ?? '',
  );
  if (matched) {
    return matched;
  }
  return labelled || colonAfter ? ThreadCalloutKind.Note : null;
}
