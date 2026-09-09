/**
 * The provider family pages under `/models`.
 *
 * Named `ModelProviderPage` rather than `ModelProvider` so it can never be
 * confused with `@claw/shared-types`' `ConnectorProvider` — that enum is the
 * authority for which adapters exist; this one is only the six pages built
 * from it (§7 of the SEO content architecture doc). `AWS_BEDROCK` has a
 * `ConnectorProvider` member but no page — it is connector scaffolding with
 * no model sync, excluded on purpose (F2, §6). Qwen, Kimi and GLM have no
 * `ConnectorProvider` member at all and are refused for the same reason
 * `/models/qwen` etc. were refused (F6, §6): they exist only as `/compare`
 * rivals or as open-weight models a user may run locally.
 */
export enum ModelProviderPage {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  DEEPSEEK = 'deepseek',
  XAI = 'xai',
  LOCAL_AI = 'local-ai',
}
