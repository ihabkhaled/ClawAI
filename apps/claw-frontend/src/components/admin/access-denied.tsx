import type { TranslateFunction } from '@/types';

type AccessDeniedProps = {
  t: TranslateFunction;
};

export function AccessDenied({ t }: AccessDeniedProps): React.ReactElement {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-muted-foreground">{t('common.accessDenied')}</p>
    </div>
  );
}
