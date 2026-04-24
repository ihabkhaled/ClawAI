import { Workflow } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { WorkflowObjectListProps } from '@/types/component.types';

import { WorkflowObjectRow } from './workflow-object-row';

export function WorkflowObjectList({
  objects,
  selectedItemIds,
  isLoading,
  isError,
  onAdd,
  onRemove,
  t,
}: WorkflowObjectListProps): React.ReactElement {
  if (isLoading) {
    return <LoadingSpinner label={t('workflow.page.title')} />;
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t('workflow.page.error_title')}</p>;
  }

  if (objects.length === 0) {
    return (
      <EmptyState
        icon={Workflow}
        title={t('workflow.page.empty_title')}
        description={t('workflow.page.empty_description')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {objects.map((object) => (
        <WorkflowObjectRow
          key={object.id}
          object={object}
          isSelected={selectedItemIds.includes(object.id)}
          onAdd={onAdd}
          onRemove={onRemove}
          t={t}
        />
      ))}
    </div>
  );
}
