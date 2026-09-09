import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PromptGuideHubPage } from '@/components/marketing/prompts/prompt-guide-hub-page';
import { PromptGuideTopicPage as PromptGuideTopicPageComponent } from '@/components/marketing/prompts/prompt-guide-topic-page';
import { PROMPT_GUIDE_CONTENT_BY_LOCALE } from '@/constants/prompt-guide-content.constants';
import { PROMPT_GUIDE_TOPIC_ORDER, getPromptGuideTopicPath } from '@/constants/prompts.constants';
import { Locale } from '@/enums/locale.enum';
import { PromptGuideTopic } from '@/enums/prompt-guide-topic.enum';

vi.mock('next/headers', () => ({
  headers: async (): Promise<Headers> => new Headers({ 'x-claw-locale': 'en' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function readJsonLd(container: HTMLElement): { '@graph': Array<Record<string, unknown>> } {
  const script = container.querySelector('script[type="application/ld+json"]');
  return JSON.parse(script?.textContent ?? '{}') as {
    '@graph': Array<Record<string, unknown>>;
  };
}

describe('PromptGuideHubPage', () => {
  it('renders exactly one h1 and a card for every topic', async () => {
    render(await PromptGuideHubPage());

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const topic of PROMPT_GUIDE_TOPIC_ORDER) {
      const title = PROMPT_GUIDE_CONTENT_BY_LOCALE[Locale.EN].topics[topic].title;
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      expect(screen.getByRole('link', { name: new RegExp(`^${escaped}`, 'i') })).toHaveAttribute(
        'href',
        `/en${getPromptGuideTopicPath(topic)}`,
      );
    }
  });

  it('emits a CollectionPage, a breadcrumb trail and an ItemList', async () => {
    const { container } = render(await PromptGuideHubPage());
    const types = readJsonLd(container)['@graph'].map((node) => node['@type']);
    expect(types).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList']);
  });
});

describe('PromptGuideTopicPage', () => {
  it('renders exactly one h1', async () => {
    render(await PromptGuideTopicPageComponent({ topic: PromptGuideTopic.WRITING_CLEAR_PROMPTS }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders every section as an h2, and the questions block', async () => {
    render(await PromptGuideTopicPageComponent({ topic: PromptGuideTopic.WRITING_CLEAR_PROMPTS }));
    const content =
      PROMPT_GUIDE_CONTENT_BY_LOCALE[Locale.EN].topics[PromptGuideTopic.WRITING_CLEAR_PROMPTS];
    for (const section of content.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('heading', { level: 2, name: 'Questions people ask' }),
    ).toBeInTheDocument();
  });

  it('never claims a prompt guarantees correctness or eliminates hallucination', async () => {
    for (const topic of PROMPT_GUIDE_TOPIC_ORDER) {
      const { container } = render(await PromptGuideTopicPageComponent({ topic }));
      expect(container.textContent?.toLowerCase()).not.toMatch(/\bguarantees? correct/u);
      expect(container.textContent?.toLowerCase()).not.toMatch(/\beliminates? hallucinat/u);
    }
  });

  it('structured-output guide cross-links what are structured AI outputs rather than duplicating it', async () => {
    render(
      await PromptGuideTopicPageComponent({
        topic: PromptGuideTopic.PROMPTING_FOR_STRUCTURED_OUTPUT,
      }),
    );
    expect(screen.getAllByText(/structured AI outputs/iu).length).toBeGreaterThan(0);
  });

  it('emits TechArticle with a three-step breadcrumb and the FAQ it renders', async () => {
    const { container } = render(
      await PromptGuideTopicPageComponent({ topic: PromptGuideTopic.WRITING_CLEAR_PROMPTS }),
    );
    const graph = readJsonLd(container)['@graph'];
    expect(graph.map((node) => node['@type'])).toEqual([
      'TechArticle',
      'BreadcrumbList',
      'FAQPage',
    ]);

    const faqNode = graph[2] as { mainEntity: Array<{ name: string }> };
    const rendered =
      PROMPT_GUIDE_CONTENT_BY_LOCALE[Locale.EN].topics[PromptGuideTopic.WRITING_CLEAR_PROMPTS].faq;
    expect(faqNode.mainEntity.map((entry) => entry.name)).toEqual(
      rendered.map((entry) => entry.question),
    );
  });

  it('links back to the hub', async () => {
    render(await PromptGuideTopicPageComponent({ topic: PromptGuideTopic.WRITING_CLEAR_PROMPTS }));
    expect(screen.getAllByRole('link', { name: 'All prompt guides' })[0]).toHaveAttribute(
      'href',
      '/en/prompts',
    );
  });
});
