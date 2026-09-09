/**
 * The provider-family pairs under `/compare/models`.
 *
 * Was planned as `/compare/models/gpt-vs-claude` (model A vs model B) — §8.2
 * of the SEO content architecture doc rejects that shape outright: a page
 * comparing two products ClawAI sells neither of, with benchmarks refused
 * (§6), substantiates nothing under EU comparative-advertising law
 * (Dir. 2006/114/EC art. 4; German UWG §6 is competitor-enforced). Every page
 * in this cluster instead explains how **ClawAI's own router** chooses
 * between two families for a given kind of request — a claim about our own
 * behaviour, not a ranking of third-party products.
 *
 * Capped at family level (`ModelProviderPage`, not individual models) and at
 * six pairs, not the full C(5,2)=10 cloud-family matrix or C(16,2)=120 model
 * matrix §8.4 warns nothing bounds. Capping reasoning recorded in
 * `docs/05-frontend/seo-content-architecture.md` §9.1.
 */
export enum ModelFamilyPair {
  OPENAI_VS_ANTHROPIC = 'openai-vs-anthropic',
  OPENAI_VS_GOOGLE = 'openai-vs-google',
  ANTHROPIC_VS_GOOGLE = 'anthropic-vs-google',
  OPENAI_VS_DEEPSEEK = 'openai-vs-deepseek',
  OPENAI_VS_XAI = 'openai-vs-xai',
  CLOUD_VS_LOCAL = 'cloud-vs-local',
}
