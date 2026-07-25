'use client';

import { MARKETING_FAQ_CATEGORIES } from '@/constants/marketing-faq.constants';

import { FaqCategoryBlock } from './faq-category-block';

// The body of the FAQ page: every category rendered in registry order.
export function FaqCategoriesSection(): React.ReactElement {
  return (
    <section className="mx-auto max-w-4xl space-y-14 px-4 py-16 sm:px-6 lg:px-8">
      {MARKETING_FAQ_CATEGORIES.map((category) => (
        <FaqCategoryBlock key={category.id} category={category} />
      ))}
    </section>
  );
}
