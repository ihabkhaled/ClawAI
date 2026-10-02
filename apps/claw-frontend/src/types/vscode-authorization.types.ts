import type { TranslateFunction } from '@/types/i18n.types';

export interface VscodeAuthorizationDetails {
  clientName: string;
  expiresIn: number;
}

export interface VscodeAuthorizationApproval {
  redirectUri: string;
}

/** Controller for /authorize/vscode. `errorMessage` is already translated. */
export type UseVscodeAuthorizationPageReturn = {
  details: VscodeAuthorizationDetails | undefined;
  isLoadingDetails: boolean;
  isApproving: boolean;
  completed: boolean;
  errorMessage: string | null;
  approve: () => void;
  t: TranslateFunction;
};
