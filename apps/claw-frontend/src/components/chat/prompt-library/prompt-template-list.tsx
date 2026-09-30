import { Pencil, Plus, Star, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import type { PromptTemplateListProps } from '@/types';

/**
 * Search, tag filter, favourites toggle and the template rows. Delete confirms
 * inline in the row, so no second dialog stacks on top of this one.
 */
export function PromptTemplateList(props: PromptTemplateListProps): React.ReactElement {
  const { t } = useTranslation();
  const { filters } = props;
  const isFiltered = filters.q.trim().length > 0 || filters.tag !== null || filters.favoriteOnly;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          className="w-full sm:w-auto sm:min-w-0 sm:flex-1"
          value={filters.q}
          placeholder={t('promptLibrary.searchPlaceholder')}
          aria-label={t('promptLibrary.searchLabel')}
          onChange={(event) => props.onFiltersChange({ ...filters, q: event.target.value })}
        />
        <Button
          type="button"
          variant={filters.favoriteOnly ? 'default' : 'outline'}
          size="sm"
          aria-pressed={filters.favoriteOnly}
          onClick={() => props.onFiltersChange({ ...filters, favoriteOnly: !filters.favoriteOnly })}
        >
          <Star className="me-1 h-4 w-4" />
          {t('promptLibrary.favoritesOnly')}
        </Button>
        <Button type="button" size="sm" onClick={props.onStartCreate}>
          <Plus className="me-1 h-4 w-4" />
          {t('promptLibrary.newTemplate')}
        </Button>
      </div>

      {props.availableTags.length > 0 ? (
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label={t('promptLibrary.tagFilter')}
        >
          {props.availableTags.map((tag) => (
            <Button
              key={tag}
              type="button"
              size="sm"
              variant={filters.tag === tag ? 'default' : 'outline'}
              aria-pressed={filters.tag === tag}
              onClick={() =>
                props.onFiltersChange({ ...filters, tag: filters.tag === tag ? null : tag })
              }
            >
              {tag}
            </Button>
          ))}
        </div>
      ) : null}

      {props.isLoading ? (
        <p className="text-muted-foreground text-sm">{t('promptLibrary.loading')}</p>
      ) : null}
      {props.isError ? (
        <p role="alert" className="text-destructive text-sm">
          {t('promptLibrary.loadFailed')}
        </p>
      ) : null}
      {!props.isLoading && !props.isError && props.templates.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {isFiltered ? t('promptLibrary.emptyFiltered') : t('promptLibrary.empty')}
        </p>
      ) : null}

      <ul className="max-h-80 space-y-2 overflow-y-auto">
        {props.templates.map((template) => (
          <li key={template.id} className="rounded-md border p-2">
            <div className="flex items-start gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-w-0 flex-1 flex-col items-start justify-start p-1 text-start"
                onClick={() => props.onChoose(template)}
              >
                <span className="block truncate text-sm font-medium">{template.title}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-pressed={template.isFavorite}
                aria-label={
                  template.isFavorite
                    ? t('promptLibrary.favoriteRemove')
                    : t('promptLibrary.favoriteAdd')
                }
                onClick={() => props.onToggleFavorite(template)}
              >
                <Star className={template.isFavorite ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('promptLibrary.edit')}
                onClick={() => props.onStartEdit(template)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('promptLibrary.delete')}
                onClick={() => props.onRequestDelete(template.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {props.pendingDeleteId === template.id ? (
              <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="flex-1">{t('promptLibrary.deleteConfirm')}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => props.onRequestDelete(null)}
                >
                  {t('promptLibrary.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => props.onConfirmDelete(template.id)}
                >
                  {t('promptLibrary.deleteAction')}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {props.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={props.onLoadMore}
          isLoading={props.isFetchingNextPage}
        >
          {t('promptLibrary.loadMore')}
        </Button>
      ) : null}
    </div>
  );
}
