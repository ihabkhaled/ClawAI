// Whether an administrator has chosen to offer this synced deployment to
// users. Distinct from lifecycle, which is what the provider says about the
// model rather than what ClawAI is willing to serve.
export enum ConnectorModelExposure {
  UNEXPOSED = 'UNEXPOSED',
  EXPOSED = 'EXPOSED',
}
