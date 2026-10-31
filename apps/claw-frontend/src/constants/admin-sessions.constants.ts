import { SessionGlobalAction } from '@/enums/session-global-action.enum';
import { SessionState } from '@/enums/session-state.enum';
import { SessionTerminationReason } from '@/enums/session-termination-reason.enum';

/** Filter chips on the sessions page: the value sent to the API, and its label key. */
export const SESSION_STATE_FILTER_OPTIONS: readonly {
  value: SessionState | null;
  labelKey: string;
}[] = [
  { value: null, labelKey: 'adminSessions.filterAll' },
  { value: SessionState.ACTIVE, labelKey: 'adminSessions.stateActive' },
  { value: SessionState.EXPIRED, labelKey: 'adminSessions.stateExpired' },
  { value: SessionState.TERMINATED, labelKey: 'adminSessions.stateTerminated' },
];

export const SESSION_STATE_LABEL_KEYS: Readonly<Record<SessionState, string>> = {
  [SessionState.ACTIVE]: 'adminSessions.stateActive',
  [SessionState.EXPIRED]: 'adminSessions.stateExpired',
  [SessionState.TERMINATED]: 'adminSessions.stateTerminated',
};

export const SESSION_REASON_LABEL_KEYS: Readonly<Record<SessionTerminationReason, string>> = {
  [SessionTerminationReason.USER_LOGOUT]: 'adminSessions.reasonUserLogout',
  [SessionTerminationReason.ADMIN_TERMINATED]: 'adminSessions.reasonAdminTerminated',
  [SessionTerminationReason.ADMIN_TERMINATED_ALL]: 'adminSessions.reasonAdminTerminatedAll',
  [SessionTerminationReason.GLOBAL_TERMINATION]: 'adminSessions.reasonGlobalTermination',
  [SessionTerminationReason.TOKEN_REUSE]: 'adminSessions.reasonTokenReuse',
  [SessionTerminationReason.ACCOUNT_BANNED]: 'adminSessions.reasonAccountBanned',
  [SessionTerminationReason.PASSWORD_CHANGED]: 'adminSessions.reasonPasswordChanged',
  [SessionTerminationReason.ACCOUNT_DEACTIVATED]: 'adminSessions.reasonAccountDeactivated',
  [SessionTerminationReason.ACCOUNT_CHANGED]: 'adminSessions.reasonAccountChanged',
};

export const SESSION_DEVICE_KIND_LABEL_KEYS: Readonly<Record<string, string>> = {
  DESKTOP: 'adminSessions.deviceDesktop',
  MOBILE: 'adminSessions.deviceMobile',
  TABLET: 'adminSessions.deviceTablet',
  TOOL: 'adminSessions.deviceTool',
  UNKNOWN: 'adminSessions.deviceUnknown',
};

export const SESSION_CLIENT_KIND_LABEL_KEYS: Readonly<Record<string, string>> = {
  WEB: 'adminSessions.clientWeb',
  VSCODE: 'adminSessions.clientVscode',
};

/** Badge look per state: green live, grey finished by the clock, red ended on purpose. */
export const SESSION_STATE_BADGE_VARIANTS: Readonly<
  Record<SessionState, 'success' | 'secondary' | 'destructive'>
> = {
  [SessionState.ACTIVE]: 'success',
  [SessionState.EXPIRED]: 'secondary',
  [SessionState.TERMINATED]: 'destructive',
};

export const SESSION_PAGE_SIZE_DEFAULT = 10;
export const SESSION_FILTER_ALL_KEY = 'all';
export const SESSIONS_EMPTY_VALUE = '-';

/** Typed to confirm each system-wide action. Compared exactly by the server, so keep in step with it. */
export const SESSION_GLOBAL_PHRASES: Readonly<Record<SessionGlobalAction, string>> = {
  [SessionGlobalAction.TERMINATE_ALL]: 'TERMINATE ALL',
  [SessionGlobalAction.CLEAR_ALL_LOGS]: 'CLEAR ALL LOGS',
};

/** The one-time token lives 60 s on the server; the dialog stops offering it a little earlier. */
export const SESSION_GLOBAL_TOKEN_UI_SECONDS = 55;
export const SESSION_GLOBAL_PASSWORD_MAX_LENGTH = 1024;
