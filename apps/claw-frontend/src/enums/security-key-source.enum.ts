/**
 * Where a captcha key in force comes from (GET /admin/security/sign-up/status).
 * A key saved on the Sign-up protection page wins over the server environment.
 */
export enum SecurityKeySource {
  /** Saved on the Sign-up protection page (a SystemSetting row). */
  SETTING = 'SETTING',
  /** The auth-service environment, used while no key is saved on the page. */
  ENVIRONMENT = 'ENVIRONMENT',
  /** Neither: the key is not set anywhere. */
  NONE = 'NONE',
}
