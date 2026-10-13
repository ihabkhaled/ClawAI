/** How a plugin signs in to the service it talks to. Mirrors the plugin service's AuthKind. */
export enum PluginAuthKind {
  None = 'NONE',
  ApiKey = 'API_KEY',
  BearerToken = 'BEARER_TOKEN',
  OAuth2Pkce = 'OAUTH2_PKCE',
}
