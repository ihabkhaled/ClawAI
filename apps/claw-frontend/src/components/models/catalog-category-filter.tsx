import { Button } from '@/components/ui/button';
import { MODEL_CATEGORIES, MODEL_CATEGORY_LABELS } from '@/constants';
import type { CatalogCategoryFilterProps } from '@/types';

export function CatalogCategoryFilter({
  selectedCategory,
  onSelect,
  t,
}: CatalogCategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedCategory === undefined ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelect(undefined)}
      >
        {t('catalog.allCategories')}
      </Button>
      {MODEL_CATEGORIES.map((cat) => (
        <Button
          key={cat}
          variant={selectedCategory === cat ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(cat)}
        >
          {MODEL_CATEGORY_LABELS[cat] ?? cat}
        </Button>
      ))}
    </div>
  );
}
