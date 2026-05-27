import { useState } from 'react';

import {
  ROUTING_PLAYGROUND_DEFAULT_MODE,
  ROUTING_PLAYGROUND_TAB_SEMANTIC,
} from '@/constants';
import type { RoutingMode } from '@/enums';
import { useRoutingPlaygroundSemantic } from '@/hooks/routing/use-routing-playground-semantic';
import type { RoutingPlaygroundPageReturn, RoutingPlaygroundTab } from '@/types';

export function useRoutingPlaygroundPage(): RoutingPlaygroundPageReturn {
  const [activeTab, setActiveTab] = useState<RoutingPlaygroundTab>(
    ROUTING_PLAYGROUND_TAB_SEMANTIC,
  );
  const [message, setMessage] = useState('');
  const [routingMode, setRoutingMode] = useState<RoutingMode>(ROUTING_PLAYGROUND_DEFAULT_MODE);
  const semantic = useRoutingPlaygroundSemantic();

  const handleRunSemantic = (): void => {
    if (message.trim().length === 0) {
      return;
    }
    semantic.mutate({ message, routingMode });
  };

  const resetForm = (): void => {
    setMessage('');
    setRoutingMode(ROUTING_PLAYGROUND_DEFAULT_MODE);
    semantic.reset();
  };

  return {
    activeTab,
    setActiveTab,
    message,
    setMessage,
    routingMode,
    setRoutingMode,
    handleRunSemantic,
    resetForm,
    semanticResult: semantic.data,
    isSemanticPending: semantic.isPending,
    isSemanticError: semantic.isError,
    semanticError: semantic.error?.message ?? null,
  };
}
