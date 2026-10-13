/** How much harm one plugin tool can do. Mirrors the plugin service's RiskLevel. */
export enum PluginRiskLevel {
  Read = 'READ',
  Write = 'WRITE',
  Destructive = 'DESTRUCTIVE',
}
