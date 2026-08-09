export const GATEWAY_MODE_OPTIONS = ['SANDBOX', 'LIVE', 'TESTING', 'PRODUCTION'] as const;

export const EMPTY_GATEWAY_CREDENTIALS: Record<string, string> = {};

export const GATEWAY_CREDENTIAL_LABEL_KEYS: Readonly<Record<string, string>> = {
  clientId: 'adminGatewayConfig.fields.clientId',
  clientSecret: 'adminGatewayConfig.fields.clientSecret',
  webhookId: 'adminGatewayConfig.fields.webhookId',
  secretKey: 'adminGatewayConfig.fields.secretKey',
  publicKey: 'adminGatewayConfig.fields.publicKey',
  apiKey: 'adminGatewayConfig.fields.apiKey',
  hmacSecret: 'adminGatewayConfig.fields.hmacSecret',
  cardIntegrationId: 'adminGatewayConfig.fields.cardIntegrationId',
};

export const GENERIC_GATEWAY_CREDENTIAL_LABEL_KEY = 'adminGatewayConfig.fields.credential';
