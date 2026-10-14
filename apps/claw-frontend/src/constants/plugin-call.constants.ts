import { PluginCallStatus } from '@/enums/plugin-call-status.enum';
import { PluginNoticeCode } from '@/enums/plugin-notice-code.enum';

/** Typed maps, not template keys: a new status without copy fails typecheck. */
export const PLUGIN_CALL_STATUS_KEYS: Readonly<Record<PluginCallStatus, string>> = {
  [PluginCallStatus.OK]: 'pluginChat.calls.status.ok',
  [PluginCallStatus.ERROR]: 'pluginChat.calls.status.error',
  [PluginCallStatus.CONSENT_REQUIRED]: 'pluginChat.calls.status.consentRequired',
  [PluginCallStatus.BLOCKED]: 'pluginChat.calls.status.blocked',
  [PluginCallStatus.RATE_LIMITED]: 'pluginChat.calls.status.rateLimited',
  [PluginCallStatus.QUOTA_EXCEEDED]: 'pluginChat.calls.status.quotaExceeded',
};

export const PLUGIN_NOTICE_KEYS: Readonly<Record<PluginNoticeCode, string>> = {
  [PluginNoticeCode.SERVICE_UNAVAILABLE]: 'pluginChat.notices.serviceUnavailable',
  [PluginNoticeCode.NO_TOOLS]: 'pluginChat.notices.noTools',
  [PluginNoticeCode.CONSENT_NOT_AVAILABLE]: 'pluginChat.notices.consentNotAvailable',
  [PluginNoticeCode.LIMIT_REACHED]: 'pluginChat.notices.limitReached',
};

/** Statuses a reader should see as a problem rather than a result. */
export const PLUGIN_CALL_FAILED_STATUSES: ReadonlySet<PluginCallStatus> = new Set([
  PluginCallStatus.ERROR,
  PluginCallStatus.BLOCKED,
  PluginCallStatus.RATE_LIMITED,
  PluginCallStatus.QUOTA_EXCEEDED,
]);
