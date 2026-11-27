/** `action` of the structured security event every anti-abuse refusal writes. */
export enum SecurityEventAction {
  SIGNUP_REFUSED_DISPOSABLE = 'signup_refused_disposable',
  SIGNUP_REFUSED_BOT_CHECK = 'signup_refused_bot_check',
  SIGNUP_VELOCITY_LIMITED = 'signup_velocity_limited',
  TRIAL_DENIED_SHARED_DEVICE = 'trial_denied_shared_device',
  LOGIN_BOT_CHECK_REQUIRED = 'login_bot_check_required',
}
