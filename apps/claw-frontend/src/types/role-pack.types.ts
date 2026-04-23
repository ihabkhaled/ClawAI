import type { RolePackName } from '@/enums/role-pack.enum';

import type {
  AdvancedModuleModelSelection,
  AdvancedModelSelectionPayload,
} from './advanced-model-selection.types';
import type { TranslateFunction } from './i18n.types';

export type RolePack = RolePackName;

export type RoleMemberResult = {
  role: string;
  model: string;
  output: string;
  latencyMs: number;
};

export type RolePackMetadata = {
  rolePack: boolean;
  pack: RolePack;
  members: RoleMemberResult[];
};

export type RolePackResult = {
  content: string;
  metadata: RolePackMetadata;
};

export type SendRolePackPayload = AdvancedModelSelectionPayload & {
  content: string;
  pack: RolePack;
};

export type SendRolePackResult = {
  messageId: string;
  threadId: string;
};

export type UseSendRolePackResult = {
  mutate: (payload: SendRolePackPayload) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: SendRolePackResult | undefined;
};

export type UseRolePackPollResult = {
  rolePackResult: RolePackResult | null;
  isPolling: boolean;
  isRolePackReady: boolean;
  isRolePackError: boolean;
  handleViewInThread: () => void;
};

export type UseRolePackPageReturn = {
  t: TranslateFunction;
  content: string;
  setContent: (value: string) => void;
  pack: RolePack;
  setPack: (value: RolePack) => void;
  selectedModel: AdvancedModuleModelSelection;
  setSelectedModel: (value: AdvancedModuleModelSelection) => void;
  handleSend: () => void;
  canSend: boolean;
  isPending: boolean;
  isError: boolean;
  isRolePackError: boolean;
  rolePackResult: RolePackResult | null;
  isPolling: boolean;
  isRolePackReady: boolean;
  handleViewInThread: () => void;
};
