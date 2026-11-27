/**
 * The reCAPTCHA v3 action a bot check runs under. The server compares the
 * token's action with the route it arrived on, so a token minted on the login
 * page cannot be replayed against sign-up.
 */
export enum BotCheckAction {
  REGISTER = 'register',
  LOGIN = 'login',
}
