import { type PublishedParameterCountRule } from '../types/model-parameter-count.types';

/// ADR-234 — model size in every picker. WHERE A PARAMETER COUNT MAY COME FROM,
/// in order of trust:
///   1. a local runtime's own report for the file it runs (Ollama, llama.cpp);
///   2. an entry below, read from the MAKER's own page (never an aggregator,
///      never a wiki, never memory);
///   3. the maker's own model name when it states the count and is
///      unambiguous (`qwen3-235b-a22b`, `gemma-3-27b-it`): see
///      `PARAMETER_NAMING_FAMILIES`.
/// Anything else stays NULL, and the picker shows the context window alone.
/// Every closed model (GPT, Claude, Gemini, Grok, Mistral Medium, Command A+) is
/// absent on purpose: its maker publishes no count, and a guess in a size column
/// is worse than a blank one.

/// Counts in BILLIONS of parameters (0.5 = 500M, 1000 = 1T). `activeBillions`
/// is the per-token share of a mixture-of-experts model.
///
/// `keys` are EXACT, normalised model keys: lower case, the `org/` or `models/`
/// prefix removed, any `:tag` kept (OpenRouter `moonshotai/kimi-k2` and Ollama
/// `kimi-k2:1t-cloud` both reach the Kimi rule). Exact keys, not patterns: a
/// sibling the maker did not publish a number for (`deepseek-v3.2`, `glm-4.7`,
/// `minimax-m2.1`) cannot match by accident, and no `:latest` is listed, because
/// Ollama's `:latest` is often a small default (`gpt-oss:latest` is the 20B).
/// Read 2026-11-28.
export const PUBLISHED_PARAMETER_COUNT_RULES: readonly PublishedParameterCountRule[] =
  Object.freeze([
    // ── DeepSeek: "671B total parameters with 37B activated for each token".
    {
      keys: ['deepseek-v3', 'deepseek-v3:671b', 'deepseek-v3:671b-cloud'],
      totalBillions: 671,
      activeBillions: 37,
      source: 'https://huggingface.co/deepseek-ai/DeepSeek-V3',
    },
    {
      keys: ['deepseek-v3.1', 'deepseek-v3.1:671b', 'deepseek-v3.1:671b-cloud'],
      totalBillions: 671,
      activeBillions: 37,
      source: 'https://huggingface.co/deepseek-ai/DeepSeek-V3.1',
    },
    {
      // Ollama's own `deepseek-r1:latest` is a small distill, so only the 671b tags are listed.
      keys: ['deepseek-r1', 'deepseek-r1:671b', 'deepseek-r1:671b-cloud'],
      totalBillions: 671,
      activeBillions: 37,
      source: 'https://huggingface.co/deepseek-ai/DeepSeek-R1',
    },
    // ── Moonshot Kimi K2: "32 billion activated parameters and 1 trillion total parameters".
    {
      keys: ['kimi-k2', 'kimi-k2-instruct', 'kimi-k2:1t', 'kimi-k2:1t-cloud'],
      totalBillions: 1000,
      activeBillions: 32,
      source: 'https://huggingface.co/moonshotai/Kimi-K2-Instruct',
    },
    {
      keys: ['kimi-k2-0905', 'kimi-k2-instruct-0905'],
      totalBillions: 1000,
      activeBillions: 32,
      source: 'https://huggingface.co/moonshotai/Kimi-K2-Instruct-0905',
    },
    {
      keys: ['kimi-k2-thinking', 'kimi-k2-thinking:cloud'],
      totalBillions: 1000,
      activeBillions: 32,
      source: 'https://huggingface.co/moonshotai/Kimi-K2-Thinking',
    },
    {
      keys: ['kimi-k2.5', 'kimi-k2.5:cloud', 'kimi-k2.5:1t-cloud'],
      totalBillions: 1000,
      activeBillions: 32,
      source: 'https://huggingface.co/moonshotai/Kimi-K2.5',
    },
    // ── Z.ai GLM.
    {
      keys: ['glm-4.5'],
      totalBillions: 355,
      activeBillions: 32,
      source: 'https://huggingface.co/zai-org/GLM-4.5',
    },
    {
      keys: ['glm-4.5-air'],
      totalBillions: 106,
      activeBillions: 12,
      source: 'https://huggingface.co/zai-org/GLM-4.5-Air',
    },
    {
      // The card states the base model's figure: "based on ... GLM-4.5-Air (106B parameters, 12B active)".
      keys: ['glm-4.5v'],
      totalBillions: 106,
      activeBillions: 12,
      source: 'https://huggingface.co/zai-org/GLM-4.5V',
    },
    {
      // The maker's README table lists GLM-4.6 as "355B-A32B"; the card text states no count.
      keys: ['glm-4.6', 'glm-4.6:cloud'],
      totalBillions: 355,
      activeBillions: 32,
      source: 'https://github.com/zai-org/GLM-4.5',
    },
    // ── OpenAI gpt-oss: the cards say 117B / 5.1B and 21B / 3.6B; the model NAMES say 120b / 20b.
    {
      keys: ['gpt-oss-120b', 'gpt-oss:120b', 'gpt-oss:120b-cloud'],
      totalBillions: 117,
      activeBillions: 5.1,
      source: 'https://huggingface.co/openai/gpt-oss-120b',
    },
    {
      keys: ['gpt-oss-20b', 'gpt-oss:20b', 'gpt-oss:20b-cloud'],
      totalBillions: 21,
      activeBillions: 3.6,
      source: 'https://huggingface.co/openai/gpt-oss-20b',
    },
    // ── Meta Llama 4 (the 17B in the id is the ACTIVE count, so the id parser skips it).
    {
      keys: [
        'llama-4-scout',
        'llama-4-scout-17b-16e',
        'llama-4-scout-17b-16e-instruct',
        'llama4:scout',
        'llama4:16x17b',
      ],
      totalBillions: 109,
      activeBillions: 17,
      source: 'https://ai.meta.com/blog/llama-4-multimodal-intelligence/',
    },
    {
      keys: [
        'llama-4-maverick',
        'llama-4-maverick-17b-128e',
        'llama-4-maverick-17b-128e-instruct',
        'llama-4-maverick-17b-128e-instruct-fp8',
        'llama4:maverick',
        'llama4:128x17b',
      ],
      totalBillions: 400,
      activeBillions: 17,
      source: 'https://ai.meta.com/blog/llama-4-multimodal-intelligence/',
    },
    // ── Mistral: the product of an `8xNb` name is not the total, so these are explicit.
    {
      keys: ['mixtral-8x7b', 'mixtral-8x7b-instruct', 'mixtral-8x7b-instruct-v0.1', 'mixtral:8x7b'],
      totalBillions: 46.7,
      activeBillions: 12.9,
      source: 'https://mistral.ai/news/mixtral-of-experts',
    },
    {
      keys: [
        'mixtral-8x22b',
        'mixtral-8x22b-instruct',
        'mixtral-8x22b-instruct-v0.1',
        'mixtral:8x22b',
      ],
      totalBillions: 141,
      activeBillions: 39,
      source: 'https://mistral.ai/news/mixtral-8x22b',
    },
    {
      keys: ['mistral-nemo', 'mistral-nemo-instruct-2407', 'mistral-nemo:12b'],
      totalBillions: 12,
      source: 'https://mistral.ai/news/mistral-nemo',
    },
    {
      keys: ['mistral-large-2407'],
      totalBillions: 123,
      source: 'https://mistral.ai/news/mistral-large-2407',
    },
    // ── MiniMax.
    {
      keys: [
        'minimax-m1',
        'minimax-m1-80k',
        'minimax-m1-40k',
        'minimax-01',
        'minimax-text-01',
        'minimax-vl-01',
      ],
      totalBillions: 456,
      activeBillions: 45.9,
      source: 'https://huggingface.co/MiniMaxAI/MiniMax-M1-80k',
    },
    {
      keys: ['minimax-m2', 'minimax-m2:cloud'],
      totalBillions: 230,
      activeBillions: 10,
      source: 'https://huggingface.co/MiniMaxAI/MiniMax-M2',
    },
    // ── Microsoft Phi.
    {
      keys: ['phi-4', 'phi4', 'phi4:14b'],
      totalBillions: 14,
      source: 'https://huggingface.co/microsoft/phi-4',
    },
    {
      keys: ['phi-4-mini', 'phi-4-mini-instruct', 'phi4-mini', 'phi4-mini:3.8b'],
      totalBillions: 3.8,
      source: 'https://huggingface.co/microsoft/Phi-4-mini-instruct',
    },
    {
      keys: [
        'phi-4-reasoning',
        'phi-4-reasoning-plus',
        'phi4-reasoning',
        'phi4-reasoning:14b',
        'phi4-reasoning:plus',
      ],
      totalBillions: 14,
      source: 'https://huggingface.co/microsoft/Phi-4-reasoning',
    },
    // ── Cohere (open weights).
    {
      keys: ['command-a', 'command-a-03-2025'],
      totalBillions: 111,
      source: 'https://huggingface.co/CohereLabs/c4ai-command-a-03-2025',
    },
    {
      keys: ['command-r7b', 'command-r7b-12-2024', 'command-r7b:7b'],
      totalBillions: 7,
      source: 'https://huggingface.co/CohereLabs/c4ai-command-r7b-12-2024',
    },
    // ── Qwen3-Coder 480B as Ollama names it. The card says "480B in total and 35B activated"; the
    // tag carries only the total, so the active share needs this rule. The bare `qwen3-coder` id
    // is NOT listed: Ollama's default tag of that family is the 30B model.
    {
      keys: ['qwen3-coder:480b', 'qwen3-coder:480b-cloud'],
      totalBillions: 480,
      activeBillions: 35,
      source: 'https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct',
    },
  ]);

/// The rules as one lookup, built once. A key listed by two rules would be a typo in
/// this table, which `model-parameter-count.utility.spec.ts` asserts cannot happen.
export const PUBLISHED_PARAMETER_COUNT_INDEX: ReadonlyMap<string, PublishedParameterCountRule> =
  new Map(
    PUBLISHED_PARAMETER_COUNT_RULES.flatMap((rule) =>
      rule.keys.map((key): [string, PublishedParameterCountRule] => [key, rule]),
    ),
  );

/// DELIBERATELY ABSENT (the maker's card states no count, checked 2026-11-28): DeepSeek V3-0324,
/// V3.1-Terminus, V3.2 and R1-0528, GLM-4.7, MiniMax-M2.1. A dated sibling is not assumed to
/// share its base model's size.
///
/// Families whose own model name states the TOTAL parameter count (`gemma-3-27b-it`,
/// `llama-3.3-70b-instruct`, `qwen3-235b-a22b`, `nemotron-3-super-120b-a12b`). An id
/// that matches none of these is never parsed, so `claude-3-5-sonnet`, `gpt-4o` or
/// `o3-mini` can never be read as a size. Matched anywhere in the normalised key so
/// `hermes-3-llama-3.1-405b` and `llama-3.1-nemotron-70b-instruct` are found. The count
/// is the maker's marketed figure (`qwen3-30b-a3b` is 30.5B / 3.3B on its card).
export const PARAMETER_NAMING_FAMILIES: RegExp =
  /(?:llama|qwen|gemma|mistral|ministral|pixtral|nemotron|granite|hermes|deepseek-r1-distill|glm-4-|ui-tars)/;

/// A size token in a model name: `70b`, `7.6b`, `2.4t`. It must start at a boundary and
/// not be glued to a letter on either side, which rules out `8x7b` (the 7b follows an
/// `x`), `e4b` (an "effective" size, not a total) and `4bit`.
export const NAMED_TOTAL_PARAMETER_TOKEN: RegExp = /(?<![a-z0-9.])(\d+\.?\d*)([bt])(?![a-z0-9])/g;

/// The active share a MoE name appends: `-a22b`, `-a3b`.
export const NAMED_ACTIVE_PARAMETER_TOKEN: RegExp = /-a(\d+\.?\d*)b(?![a-z0-9])/;

/// `17b-16e`: a total/expert layout where the number is the ACTIVE size. Never parsed.
export const NAMED_EXPERT_LAYOUT: RegExp = /\d+b-\d+e(?![a-z0-9])/;

/// What a local runtime writes: `7.6B`, `671B (37B active)`, `1T`, `134.52M`. The text is split at
/// its "(" and each half matched on its own, so neither pattern nests a quantifier in a group.
export const RUNTIME_TOTAL_PATTERN: RegExp = /^\s*(\d+\.?\d*)\s*([kmbt])\s*$/i;
export const RUNTIME_ACTIVE_PATTERN: RegExp = /^\s*(\d+\.?\d*)\s*([kmbt])\s*active\s*\)\s*$/i;

/// Billions per unit letter of a runtime's size string.
export const BILLIONS_PER_UNIT: Readonly<Record<string, number>> = Object.freeze({
  k: 0.000_001,
  m: 0.001,
  b: 1,
  t: 1000,
});

/// The largest count a registry row may carry (matches the DTO).
export const MAX_PARAMETER_COUNT_BILLIONS = 100_000;

/// The run-once seed that backfills rows the sync has not touched. Bump the version
/// when a rule is added or corrected so the ledger applies the new table.
export const MODEL_PARAMETER_SEED_NAME = 'model-parameter-counts-2026';
export const MODEL_PARAMETER_SEED_VERSION = 1;

/// Next in routing-service's 740_040_00N advisory-lock block (001 = deployment backfill,
/// 002 = router chain, 003 = model costs, 004 = calibration commit).
export const MODEL_PARAMETER_SEED_LOCK_ID = 740_040_005;

/// The override field an admin pin of the total is recorded under (see OVERRIDE_MANAGED_FIELDS).
export const PARAMETER_COUNT_PINNED_FIELD = 'parameterCountBillions';
