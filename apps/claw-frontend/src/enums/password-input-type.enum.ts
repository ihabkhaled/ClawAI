// The two `type` values the shared PasswordInput toggles between. Kept as an
// enum so the visibility hook's return type does not rely on a string union.
export enum PasswordInputType {
  TEXT = 'text',
  PASSWORD = 'password',
}
