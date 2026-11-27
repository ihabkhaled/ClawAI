/** Where an effective captcha key comes from: a saved admin setting wins over the server environment. */
export enum SecurityKeySource {
  SETTING = 'SETTING',
  ENVIRONMENT = 'ENVIRONMENT',
  NONE = 'NONE',
}
