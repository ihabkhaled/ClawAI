/**
 * The two captcha providers of the Sign-up protection page. The values are the
 * property names GET /admin/security/sign-up/status reports each one under.
 */
export enum CaptchaProvider {
  TURNSTILE = 'turnstile',
  RECAPTCHA = 'recaptcha',
}
