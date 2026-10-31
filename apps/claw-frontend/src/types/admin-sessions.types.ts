import type { SessionGlobalAction } from '@/enums/session-global-action.enum';
import type { SessionGlobalStep } from '@/enums/session-global-step.enum';
import type { SessionState } from '@/enums/session-state.enum';
import type { SessionTerminationReason } from '@/enums/session-termination-reason.enum';
import type { TranslateFunction } from '@/types/i18n.types';

/** One login (a refresh family) as the admin API returns it. Dates are ISO strings. */
export type UserSession = {
  familyId: string;
  state: SessionState;
  ipAddress: string | null;
  countryCode: string | null;
  userAgent: string | null;
  os: string | null;
  browser: string | null;
  deviceKind: string | null;
  clientKind: string;
  clientName: string | null;
  persistent: boolean;
  loginAt: string;
  lastUsedAt: string;
  expiresAt: string;
  rotations: number;
  terminatedAt: string | null;
  terminationReason: SessionTerminationReason | null;
  terminatedByUserId: string | null;
  terminatedByName: string | null;
  isCurrent: boolean;
};

export type UserSessionSummary = {
  active: number;
  expired: number;
  terminated: number;
  total: number;
};

export type UserSessionsMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type UserSessionsResponse = {
  user: { id: string; username: string };
  data: UserSession[];
  meta: UserSessionsMeta;
  summary: UserSessionSummary;
};

export type SessionTerminateResult = { terminatedFamilies: number; terminatedRows: number };
export type SessionClearResult = { families: number; rows: number };
export type SessionGlobalChallengeResponse = { token: string; expiresInSeconds: number };

/** null = every state. */
export type SessionStateFilter = SessionState | null;

/** What the admin asked to do to one login or to all of a user's logins; a dialog confirms it. */
export type SessionActionTarget =
  | { kind: 'terminate-one'; session: UserSession }
  | { kind: 'terminate-all' }
  | { kind: 'clear-one'; session: UserSession }
  | { kind: 'clear-all' };

export type UseUserSessionsPageReturn = {
  t: TranslateFunction;
  locale: string;
  userId: string;
  username: string | null;
  isAdmin: boolean;
  isOwnAccount: boolean;
  isLoading: boolean;
  isError: boolean;
  sessions: UserSession[];
  summary: UserSessionSummary;
  meta: UserSessionsMeta;
  stateFilter: SessionStateFilter;
  setStateFilter: (value: SessionStateFilter) => void;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  retry: () => void;
  target: SessionActionTarget | null;
  openTarget: (target: SessionActionTarget) => void;
  closeTarget: () => void;
  isActing: boolean;
  confirmTarget: () => Promise<void>;
};

export type UserSessionsTableProps = {
  sessions: UserSession[];
  locale: string;
  isActing: boolean;
  onTerminate: (session: UserSession) => void;
  onClear: (session: UserSession) => void;
  t: TranslateFunction;
};

export type UserSessionRowProps = {
  session: UserSession;
  locale: string;
  isActing: boolean;
  onTerminate: (session: UserSession) => void;
  onClear: (session: UserSession) => void;
  t: TranslateFunction;
};

/** Words and look of the confirm dialog for one target. */
export type SessionActionCopy = {
  titleKey: string;
  bodyKey: string;
  confirmKey: string;
  destructive: boolean;
  /** True when confirming would end the administrator's own current login. */
  endsCurrentSession: boolean;
};

export type SessionActionDialogProps = {
  target: SessionActionTarget | null;
  isOwnAccount: boolean;
  isActing: boolean;
  onConfirm: () => void;
  onClose: () => void;
  t: TranslateFunction;
};

export type UseGlobalSessionGuardReturn = {
  step: SessionGlobalStep;
  action: SessionGlobalAction | null;
  password: string;
  setPassword: (value: string) => void;
  phrase: string;
  setPhrase: (value: string) => void;
  expectedPhrase: string;
  isPhraseValid: boolean;
  isBusy: boolean;
  secondsLeft: number;
  start: (action: SessionGlobalAction) => void;
  submitPassword: () => Promise<void>;
  submitConfirm: () => Promise<void>;
  cancel: () => void;
  lastResult: SessionTerminateResult | SessionClearResult | null;
};

export type GlobalSessionDialogsProps = {
  guard: UseGlobalSessionGuardReturn;
  t: TranslateFunction;
};

export type SessionStateBadgeProps = {
  state: SessionState;
  t: TranslateFunction;
};

export type UserSessionsSummaryProps = {
  summary: UserSessionSummary;
  t: TranslateFunction;
};

export type SessionStateFilterProps = {
  value: SessionStateFilter;
  onChange: (value: SessionStateFilter) => void;
  t: TranslateFunction;
};

export type UseSecuritySessionsPageReturn = {
  t: TranslateFunction;
  isSuperAdmin: boolean;
  isDenied: boolean;
  guard: UseGlobalSessionGuardReturn;
};
