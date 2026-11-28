import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RESEARCH_PLATFORM_ACCESS_METHOD_KEYS,
  RESEARCH_PLATFORM_ACCESS_METHODS,
  RESEARCH_PLATFORM_API_KIND_LABELS,
  RESEARCH_PLATFORM_API_KINDS,
  RESEARCH_PLATFORM_CATEGORIES,
  RESEARCH_PLATFORM_CATEGORY_KEYS,
} from '@/constants/research-platform.constants';
import { ResearchPlatformAccessMethod } from '@/enums/research-platform-access-method.enum';
import type { ResearchPlatformApiKind } from '@/enums/research-platform-api-kind.enum';
import type { ResearchPlatformCategory } from '@/enums/research-platform-category.enum';
import type { ResearchPlatformFormFieldsProps } from '@/types/research-platform.types';

/** Who the platform is: slug (fixed once created), name, category, how research reaches it. */
export function ResearchPlatformSourceFields({
  t,
  form,
  setField,
  isEditing,
}: ResearchPlatformFormFieldsProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="rpl-slug" className="text-sm font-medium">
          {t('researchPlatforms.form.slug')}
        </label>
        <Input
          id="rpl-slug"
          name="slug"
          value={form.slug}
          disabled={isEditing}
          onChange={(e) => setField('slug', e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="rpl-slug-hint"
        />
        <p id="rpl-slug-hint" className="text-muted-foreground text-xs">
          {t('researchPlatforms.form.slugHint')}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="rpl-name" className="text-sm font-medium">
          {t('researchPlatforms.form.name')}
        </label>
        <Input
          id="rpl-name"
          name="name"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="rpl-category" className="text-sm font-medium">
          {t('researchPlatforms.form.category')}
        </label>
        <Select
          name="category"
          value={form.category}
          onValueChange={(value) => setField('category', value as ResearchPlatformCategory)}
        >
          <SelectTrigger id="rpl-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESEARCH_PLATFORM_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {t(RESEARCH_PLATFORM_CATEGORY_KEYS[category])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="rpl-access" className="text-sm font-medium">
          {t('researchPlatforms.form.accessMethod')}
        </label>
        <Select
          name="accessMethod"
          value={form.accessMethod}
          onValueChange={(value) => setField('accessMethod', value as ResearchPlatformAccessMethod)}
        >
          <SelectTrigger id="rpl-access">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESEARCH_PLATFORM_ACCESS_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {t(RESEARCH_PLATFORM_ACCESS_METHOD_KEYS[method])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {form.accessMethod === ResearchPlatformAccessMethod.OFFICIAL_API ? (
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="rpl-api" className="text-sm font-medium">
            {t('researchPlatforms.form.apiKind')}
          </label>
          <Select
            name="apiKind"
            value={form.apiKind ?? ''}
            onValueChange={(value) => setField('apiKind', value as ResearchPlatformApiKind)}
          >
            <SelectTrigger id="rpl-api">
              <SelectValue placeholder={t('researchPlatforms.form.apiKind')} />
            </SelectTrigger>
            <SelectContent>
              {RESEARCH_PLATFORM_API_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {RESEARCH_PLATFORM_API_KIND_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
