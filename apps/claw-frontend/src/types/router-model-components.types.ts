import type { ReactElement } from 'react';

import type { RouterModelRowDisplay } from './use-router-models-page.types';

export type RouterModelRowProps = {
  row: RouterModelRowDisplay;
  onSelect: (id: string) => void;
};

export type RouterModelDetailDrawerProps = {
  modelId: string | null;
  onClose: () => void;
};

export type RouterModelDetailRowProps = {
  label: string;
  value: ReactElement | string;
};
