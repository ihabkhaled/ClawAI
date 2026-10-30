# Aggregator model price ledger (2026-10-31)

Seed v14 of the routing-service price table. Before it, 511 exposed models had no price, so a send of them was refused
on every plan, paid included (the picker dimmed them: [ADR-198](../13-adr/adr-198-model-pickers-show-the-plan-decision-and-dim-what-it-excludes.md)).
Read on 2026-10-31 from production. Stored as `source: SEED`, `confidence: ESTIMATED`: an admin override or a synced price always wins.

## How each model was priced

- **OpenRouter (325):** OpenRouter's own published price for that exact id (`https://openrouter.ai/api/v1/models`). A `:free` model is priced 0 and is class FREE.
- **Groq, NVIDIA NIM, Hugging Face:** neither NIM nor HF Inference publishes a per-token price for these routes, and Groq's pricing page was not readable. Each model takes, in order: the provider's official list price where it has one (Cohere, MiniMax, AI21, Mistral), else the same model's OpenRouter price, else a size tier (below). Rows marked ESTIMATE are approximations and should be replaced by a synced price when one exists.
- **AI Horde (4):** volunteer GPUs, no platform cost: priced 0, class FREE.
- Size tiers, $ per million in / out: up to 4B 0.05/0.10, 5-14B 0.10/0.20, 15-40B 0.20/0.40, 41-100B 0.50/0.75, 101-300B 0.80/2.40, over 300B 1.00/3.00.
- **Cost class** follows the dearer of the input and output rate: both 0 FREE, under $1 CHEAP, under $6 STANDARD, under $40 PREMIUM, above that ULTRA.
- Long-context price tiers are not expressible; the base rate is stored.
- A floating `~...-latest` alias is never priced (the model behind it changes), and a published price whose input rate is under 1/40 of its output rate is treated as implausible and left unpriced.

## Left unpriced on purpose (37)

- OPENROUTER `openrouter/auto`: OpenRouter reports a variable price
- OPENROUTER `openrouter/auto-beta`: OpenRouter reports a variable price
- OPENROUTER `openrouter/bodybuilder`: OpenRouter reports a variable price
- OPENROUTER `openrouter/fusion`: OpenRouter reports a variable price
- OPENROUTER `openrouter/pareto-code`: OpenRouter reports a variable price
- NVIDIANIM `nvidia/ai-synthetic-video-detector`: not a chat model
- NVIDIANIM `google/deplot`: not a chat model
- NVIDIANIM `adept/fuyu-8b`: not a chat model
- NVIDIANIM `nvidia/ising-calibration-1.5-31b`: not a chat model
- NVIDIANIM `microsoft/kosmos-2`: not a chat model
- NVIDIANIM `nvidia/nemotron-4-340b-reward`: not a chat model
- NVIDIANIM `nvidia/nemotron-parse`: not a chat model
- NVIDIANIM `nvidia/nemotron-parse-2.0`: not a chat model
- NVIDIANIM `nvidia/neva-22b`: not a chat model
- NVIDIANIM `nvidia/nvclip`: not a chat model
- NVIDIANIM `nvidia/vila`: not a chat model
- HUGGINGFACE `moonshotai/Kimi-K3`: published input rate is implausibly low against its output rate
- HUGGINGFACE `zai-org/GLM-5.2-FP8`: published input rate is implausibly low against its output rate
- HUGGINGFACE `zai-org/GLM-5.2`: published input rate is implausibly low against its output rate
- OPENROUTER `~z-ai/glm-latest`: floating alias: the model it points to changes
- OPENROUTER `~z-ai/glm-flash-latest`: floating alias: the model it points to changes
- OPENROUTER `z-ai/glm-5.2`: published input rate is implausibly low against its output rate
- OPENROUTER `~x-ai/grok-latest`: floating alias: the model it points to changes
- OPENROUTER `~openai/gpt-terra-latest`: floating alias: the model it points to changes
- OPENROUTER `~openai/gpt-sol-latest`: floating alias: the model it points to changes
- OPENROUTER `~openai/gpt-mini-latest`: floating alias: the model it points to changes
- OPENROUTER `~openai/gpt-luna-latest`: floating alias: the model it points to changes
- OPENROUTER `~moonshotai/kimi-latest`: floating alias: the model it points to changes
- OPENROUTER `moonshotai/kimi-k3`: published input rate is implausibly low against its output rate
- OPENROUTER `~google/gemini-pro-latest`: floating alias: the model it points to changes
- OPENROUTER `~google/gemini-flash-latest`: floating alias: the model it points to changes
- OPENROUTER `~deepseek/deepseek-v4-flash-latest`: floating alias: the model it points to changes
- OPENROUTER `~deepseek/deepseek-pro-latest`: floating alias: the model it points to changes
- OPENROUTER `~deepseek/deepseek-flash-latest`: floating alias: the model it points to changes
- OPENROUTER `~anthropic/claude-sonnet-latest`: floating alias: the model it points to changes
- OPENROUTER `~anthropic/claude-opus-latest`: floating alias: the model it points to changes
- OPENROUTER `~anthropic/claude-haiku-latest`: floating alias: the model it points to changes

## Every price

| Provider    | Model                                                       | Input $/M | Output $/M | Source                                                                        |
| ----------- | ----------------------------------------------------------- | --------- | ---------- | ----------------------------------------------------------------------------- |
| OPENROUTER  | aion-labs/aion-2.0                                          | 0.8       | 1.6        | OpenRouter published price                                                    |
| OPENROUTER  | aion-labs/aion-3.0                                          | 3         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | aion-labs/aion-3.0-mini                                     | 0.7       | 1.4        | OpenRouter published price                                                    |
| OPENROUTER  | aion-labs/aion-3.5                                          | 3         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | aion-labs/aion-3.5-mini                                     | 0.7       | 1.4        | OpenRouter published price                                                    |
| OPENROUTER  | aion-labs/aion-rp-llama-3.1-8b                              | 0.8       | 1.6        | OpenRouter published price                                                    |
| OPENROUTER  | amazon/nova-2-lite-v1                                       | 0.3       | 2.5        | OpenRouter published price                                                    |
| OPENROUTER  | amazon/nova-lite-v1                                         | 0.06      | 0.24       | OpenRouter published price                                                    |
| OPENROUTER  | amazon/nova-micro-v1                                        | 0.035     | 0.14       | OpenRouter published price                                                    |
| OPENROUTER  | amazon/nova-premier-v1                                      | 2.5       | 12.5       | OpenRouter published price                                                    |
| OPENROUTER  | amazon/nova-pro-v1                                          | 0.8       | 3.2        | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-haiku-4.5                                  | 1         | 5          | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-opus-4.1                                   | 15        | 75         | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-opus-4.5                                   | 5         | 25         | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-opus-4.6                                   | 5         | 25         | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-opus-4.7                                   | 5         | 25         | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-opus-4.8                                   | 5         | 25         | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-opus-5                                     | 5         | 25         | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-opus-5.5                                   | 4         | 20         | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-opus-5.5:batch                             | 2         | 10         | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-opus-5:batch                               | 2.5       | 12.5       | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-sonnet-4.5                                 | 3         | 15         | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-sonnet-4.6                                 | 3         | 15         | OpenRouter published price                                                    |
| OPENROUTER  | anthropic/claude-sonnet-5                                   | 2         | 10         | OpenRouter published price                                                    |
| OPENROUTER  | bytedance-seed/seed-1.6                                     | 0.25      | 2          | OpenRouter published price                                                    |
| OPENROUTER  | bytedance-seed/seed-1.6-flash                               | 0.075     | 0.3        | OpenRouter published price                                                    |
| OPENROUTER  | bytedance-seed/seed-2.0-code                                | 0.5       | 3          | OpenRouter published price                                                    |
| OPENROUTER  | bytedance-seed/seed-2.0-lite                                | 0.25      | 2          | OpenRouter published price                                                    |
| OPENROUTER  | bytedance-seed/seed-2.0-mini                                | 0.1       | 0.4        | OpenRouter published price                                                    |
| OPENROUTER  | bytedance-seed/seed-2-1-turbo                               | 0.5       | 2.5        | OpenRouter published price                                                    |
| OPENROUTER  | bytedance/ui-tars-1.5-7b                                    | 0.1       | 0.2        | OpenRouter published price                                                    |
| OPENROUTER  | cohere/command-a                                            | 2.5       | 10         | OpenRouter published price                                                    |
| OPENROUTER  | cohere/command-a-plus                                       | 0.3       | 1.5        | OpenRouter published price                                                    |
| OPENROUTER  | cohere/command-r-08-2024                                    | 0.15      | 0.6        | OpenRouter published price                                                    |
| OPENROUTER  | cohere/command-r-plus-08-2024                               | 2.5       | 10         | OpenRouter published price                                                    |
| OPENROUTER  | cohere/command-r7b-12-2024                                  | 0.0375    | 0.15       | OpenRouter published price                                                    |
| OPENROUTER  | cohere/north-mini-code:free                                 | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-chat                                      | 0.2574    | 1.0287     | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-chat-v3-0324                              | 0.29      | 1.14       | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-chat-v3.1                                 | 0.25      | 0.95       | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-v3.1-terminus                             | 0.27      | 1          | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-v3.2                                      | 0.26      | 0.38       | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-v3.2-exp                                  | 0.27      | 0.41       | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-v4.1-flash                                | 0.045     | 0.5        | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-v4.1-flash:batch                          | 0.05      | 0.15       | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-v4-flash                                  | 0.091     | 0.182      | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-v4-flash-0731                             | 0.119     | 0.238      | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-v4-flash-vision-exp                       | 0.2156    | 0.6468     | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-v4-pro                                    | 1.6       | 3.2        | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-v4-pro-0813                               | 0.66      | 1.98       | OpenRouter published price                                                    |
| OPENROUTER  | deepseek/deepseek-r1-0528                                   | 0.5       | 2.15       | OpenRouter published price                                                    |
| OPENROUTER  | dots-studio/dots-3-note-preview:free                        | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | fireworks/ember-1                                           | 3         | 15         | OpenRouter published price                                                    |
| OPENROUTER  | openrouter/free                                             | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-2.5-flash                                     | 0.3       | 2.5        | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-2.5-flash-lite                                | 0.1       | 0.4        | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-2.5-pro                                       | 1.25      | 10         | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-2.5-pro-preview                               | 1.25      | 10         | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.1-flash-lite                                | 0.25      | 1.5        | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.1-flash-lite:batch                          | 0.125     | 0.75       | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.1-flash-lite-preview                        | 0.25      | 1.5        | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.1-pro-preview                               | 2         | 12         | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.1-pro-preview:batch                         | 1         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.1-pro-preview-customtools                   | 2         | 12         | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.5-flash                                     | 1.5       | 9          | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.5-flash:batch                               | 0.75      | 4.5        | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.5-flash-lite                                | 0.3       | 2.5        | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.5-flash-lite:batch                          | 0.15      | 1.25       | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.6-flash                                     | 0.75      | 3.75       | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.6-flash:batch                               | 0.375     | 1.875      | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.7-flash                                     | 0.75      | 3.75       | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.7-flash:batch                               | 0.375     | 1.875      | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.8-flash                                     | 0.825     | 4.125      | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3.8-flash:batch                               | 0.375     | 1.875      | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3-flash-preview                               | 0.5       | 3          | OpenRouter published price                                                    |
| OPENROUTER  | google/gemini-3-flash-preview:batch                         | 0.25      | 1.5        | OpenRouter published price                                                    |
| OPENROUTER  | google/gemma-2-27b-it                                       | 0.65      | 0.65       | OpenRouter published price                                                    |
| OPENROUTER  | google/gemma-3-12b-it                                       | 0.05      | 0.15       | OpenRouter published price                                                    |
| OPENROUTER  | google/gemma-3-27b-it                                       | 0.08      | 0.35       | OpenRouter published price                                                    |
| OPENROUTER  | google/gemma-3-4b-it                                        | 0.05      | 0.1        | OpenRouter published price                                                    |
| OPENROUTER  | google/gemma-4-26b-a4b-it                                   | 0.0675    | 0.225      | OpenRouter published price                                                    |
| OPENROUTER  | google/gemma-4-26b-a4b-it:free                              | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | google/gemma-4-31b-it                                       | 0.2       | 0.4        | OpenRouter published price                                                    |
| OPENROUTER  | google/gemma-4-31b-it:free                                  | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | ibm-granite/granite-4.2-8b                                  | 0.06      | 0.15       | OpenRouter published price                                                    |
| OPENROUTER  | inception/mercury-2                                         | 0.25      | 0.75       | OpenRouter published price                                                    |
| OPENROUTER  | inception/mercury-2.5                                       | 0.04      | 0.15       | OpenRouter published price                                                    |
| OPENROUTER  | inclusionai/ling-3.0-flash                                  | 0.021     | 0.063      | OpenRouter published price                                                    |
| OPENROUTER  | inclusionai/ling-3.0-flash-vl                               | 0.06      | 0.18       | OpenRouter published price                                                    |
| OPENROUTER  | inference-net/schematron-v2-small                           | 0.05      | 0.23       | OpenRouter published price                                                    |
| OPENROUTER  | inference-net/schematron-v2-turbo                           | 0.03      | 0.15       | OpenRouter published price                                                    |
| OPENROUTER  | liquid/lfm-2.5-2.6b:free                                    | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | anthracite-org/magnum-v4-72b                                | 2.5       | 5          | OpenRouter published price                                                    |
| OPENROUTER  | mancer/weaver                                               | 0.4       | 0.75       | OpenRouter published price                                                    |
| OPENROUTER  | meituan/longcat-2.0                                         | 0.3       | 1.2        | OpenRouter published price                                                    |
| OPENROUTER  | meta-llama/llama-3.1-70b-instruct                           | 0.4       | 0.4        | OpenRouter published price                                                    |
| OPENROUTER  | meta-llama/llama-3.1-8b-instruct                            | 0.05      | 0.08       | OpenRouter published price                                                    |
| OPENROUTER  | meta-llama/llama-3.2-1b-instruct                            | 0.027     | 0.201      | OpenRouter published price                                                    |
| OPENROUTER  | meta-llama/llama-3.2-3b-instruct                            | 0.05      | 0.33       | OpenRouter published price                                                    |
| OPENROUTER  | meta-llama/llama-3.3-70b-instruct                           | 0.1       | 0.32       | OpenRouter published price                                                    |
| OPENROUTER  | meta-llama/llama-4-maverick                                 | 0.1875    | 0.6525     | OpenRouter published price                                                    |
| OPENROUTER  | meta-llama/llama-4-scout                                    | 0.1       | 0.3        | OpenRouter published price                                                    |
| OPENROUTER  | meta/muse-glimmer-30b                                       | 0.3       | 1.2        | OpenRouter published price                                                    |
| OPENROUTER  | meta/muse-spark-1.1                                         | 1.25      | 4.25       | OpenRouter published price                                                    |
| OPENROUTER  | meta/muse-spark-1.2                                         | 1.25      | 4.25       | OpenRouter published price                                                    |
| OPENROUTER  | meta/muse-spark-1.3                                         | 1.25      | 4.25       | OpenRouter published price                                                    |
| OPENROUTER  | microsoft/phi-4                                             | 0.07      | 0.14       | OpenRouter published price                                                    |
| OPENROUTER  | minimax/minimax-01                                          | 0.2       | 1.1        | OpenRouter published price                                                    |
| OPENROUTER  | minimax/minimax-m1                                          | 0.55      | 2.2        | OpenRouter published price                                                    |
| OPENROUTER  | minimax/minimax-m2                                          | 0.255     | 1.02       | OpenRouter published price                                                    |
| OPENROUTER  | minimax/minimax-m2.1                                        | 0.3       | 1.2        | OpenRouter published price                                                    |
| OPENROUTER  | minimax/minimax-m2.5                                        | 0.3       | 1.2        | OpenRouter published price                                                    |
| OPENROUTER  | minimax/minimax-m2.7                                        | 0.3       | 1.2        | OpenRouter published price                                                    |
| OPENROUTER  | minimax/minimax-m2-her                                      | 0.3       | 1.2        | OpenRouter published price                                                    |
| OPENROUTER  | minimax/minimax-m3                                          | 0.3       | 1.2        | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/codestral-2508                                    | 0.3       | 0.9        | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mistral-large                                     | 2         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mistral-large-2407                                | 2         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/ministral-14b-2512                                | 0.2       | 0.2        | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/ministral-3b-2512                                 | 0.1       | 0.1        | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/ministral-8b-2512                                 | 0.15      | 0.15       | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mistral-medium-3                                  | 0.4       | 2          | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mistral-medium-3.1                                | 0.4       | 2          | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mistral-medium-3-5                                | 1.5       | 7.5        | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mistral-medium-3-5:batch                          | 0.75      | 3.75       | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mistral-nemo                                      | 0.029     | 0.03       | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mistral-small-24b-instruct-2501                   | 0.05      | 0.08       | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mistral-small-3.1-24b-instruct                    | 0.351     | 0.555      | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mistral-small-3.2-24b-instruct                    | 0.075     | 0.2        | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mistral-small-2603                                | 0.15      | 0.6        | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mixtral-8x22b-instruct                            | 2         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/mistral-saba                                      | 0.2       | 0.6        | OpenRouter published price                                                    |
| OPENROUTER  | mistralai/voxtral-small-24b-2507                            | 0.1       | 0.3        | OpenRouter published price                                                    |
| OPENROUTER  | moonshotai/kimi-k2                                          | 0.57      | 2.3        | OpenRouter published price                                                    |
| OPENROUTER  | moonshotai/kimi-k2-0905                                     | 0.6       | 2.5        | OpenRouter published price                                                    |
| OPENROUTER  | moonshotai/kimi-k2.5                                        | 0.5       | 2.5        | OpenRouter published price                                                    |
| OPENROUTER  | moonshotai/kimi-k2.6                                        | 0.65      | 3.41       | OpenRouter published price                                                    |
| OPENROUTER  | moonshotai/kimi-k2.7-code                                   | 0.6       | 3.5        | OpenRouter published price                                                    |
| OPENROUTER  | moonshotai/kimi-k2-thinking                                 | 0.6       | 2.5        | OpenRouter published price                                                    |
| OPENROUTER  | moonshotai/kimi-k3:batch                                    | 2.28      | 11.4       | OpenRouter published price                                                    |
| OPENROUTER  | morph/morph-v3-fast                                         | 0.8       | 1.2        | OpenRouter published price                                                    |
| OPENROUTER  | morph/morph-v3-large                                        | 0.9       | 1.9        | OpenRouter published price                                                    |
| OPENROUTER  | gryphe/mythomax-l2-13b                                      | 0.08      | 0.11       | OpenRouter published price                                                    |
| OPENROUTER  | nousresearch/hermes-3-llama-3.1-405b                        | 1         | 1          | OpenRouter published price                                                    |
| OPENROUTER  | nousresearch/hermes-3-llama-3.1-70b                         | 0.7       | 0.7        | OpenRouter published price                                                    |
| OPENROUTER  | nousresearch/hermes-4-405b                                  | 1         | 3          | OpenRouter published price                                                    |
| OPENROUTER  | nvidia/nemotron-3.5-content-safety                          | 0.2       | 0.2        | OpenRouter published price                                                    |
| OPENROUTER  | nvidia/nemotron-3.5-content-safety:free                     | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | nvidia/nemotron-3.5-lightning                               | 0.07      | 0.2        | OpenRouter published price                                                    |
| OPENROUTER  | nvidia/nemotron-3.5-lightning:free                          | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | nvidia/nemotron-3-nano-30b-a3b                              | 0.06      | 0.24       | OpenRouter published price                                                    |
| OPENROUTER  | nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free          | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | nvidia/nemotron-3-super-120b-a12b                           | 0.3       | 2.4        | OpenRouter published price                                                    |
| OPENROUTER  | nvidia/nemotron-3-ultra-550b-a55b                           | 0.6       | 2.4        | OpenRouter published price                                                    |
| OPENROUTER  | nvidia/nemotron-3-ultra-550b-a55b:free                      | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-3.5-turbo-16k                                    | 3         | 4          | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-3.5-turbo-0613                                   | 1         | 2          | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-4                                                | 30        | 60         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-4.1                                              | 2         | 8          | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-4.1-mini                                         | 0.4       | 1.6        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-4.1-nano                                         | 0.1       | 0.4        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-4o                                               | 2.5       | 10         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-4o-2024-05-13                                    | 5         | 15         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-4o-2024-08-06                                    | 2.5       | 10         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-4o-2024-11-20                                    | 2.5       | 10         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-4o-mini                                          | 0.15      | 0.6        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-4o-mini-2024-07-18                               | 0.15      | 0.6        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5                                                | 1.25      | 10         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.1                                              | 1.25      | 10         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.1-codex                                        | 1.25      | 10         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.1-codex-max                                    | 1.25      | 10         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.1-codex-mini                                   | 0.25      | 2          | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.2                                              | 1.75      | 14         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.2-codex                                        | 1.75      | 14         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.2-pro                                          | 21        | 168        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.3-codex                                        | 1.75      | 14         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.4                                              | 2.5       | 15         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.4-mini                                         | 0.75      | 4.5        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.4-nano                                         | 0.2       | 1.25       | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.4-pro                                          | 30        | 180        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.5                                              | 5         | 30         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.5-pro                                          | 30        | 180        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.6-luna                                         | 0.2       | 1.2        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.6-luna:batch                                   | 0.1       | 0.6        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.6-luna-pro                                     | 0.2       | 1.2        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.6-luna-pro:batch                               | 0.1       | 0.6        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.6-sol                                          | 4         | 20         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.6-sol:batch                                    | 2         | 10         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.6-sol-pro                                      | 4         | 20         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.6-sol-pro:batch                                | 2         | 10         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.6-terra                                        | 2         | 12         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.6-terra:batch                                  | 1         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.6-terra-pro                                    | 2         | 12         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5.6-terra-pro:batch                              | 1         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5-mini                                           | 0.25      | 2          | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5-nano                                           | 0.05      | 0.4        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5-nano:batch                                     | 0.025     | 0.2        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-5-pro                                            | 15        | 120        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-6-luna                                           | 0.1       | 0.5        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-6-luna:batch                                     | 0.05      | 0.25       | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-6-luna-pro                                       | 0.1       | 0.5        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-6-luna-pro:batch                                 | 0.05      | 0.25       | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-6-sol                                            | 2         | 10         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-6-sol:batch                                      | 1         | 5          | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-6-sol-pro                                        | 2         | 10         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-6-sol-pro:batch                                  | 1         | 5          | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-audio                                            | 2.5       | 10         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-audio-mini                                       | 0.6       | 2.4        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-chat-latest                                      | 5         | 30         | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-oss-120b                                         | 0.15      | 0.6        | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-oss-120b:batch                                   | 0.0296    | 0.136      | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-oss-20b                                          | 0.018     | 0.09       | OpenRouter published price                                                    |
| OPENROUTER  | openai/gpt-oss-20b:batch                                    | 0.024     | 0.112      | OpenRouter published price                                                    |
| OPENROUTER  | openai/o3                                                   | 2         | 8          | OpenRouter published price                                                    |
| OPENROUTER  | openai/o3-pro                                               | 20        | 80         | OpenRouter published price                                                    |
| OPENROUTER  | perceptron/perceptron-mk1                                   | 0.15      | 1.5        | OpenRouter published price                                                    |
| OPENROUTER  | perplexity/sonar                                            | 1         | 1          | OpenRouter published price                                                    |
| OPENROUTER  | perplexity/sonar-pro                                        | 3         | 15         | OpenRouter published price                                                    |
| OPENROUTER  | perplexity/sonar-pro-search                                 | 3         | 15         | OpenRouter published price                                                    |
| OPENROUTER  | perplexity/sonar-reasoning-pro                              | 2         | 8          | OpenRouter published price                                                    |
| OPENROUTER  | poolside/laguna-s-2.1                                       | 0.09      | 0.18       | OpenRouter published price                                                    |
| OPENROUTER  | poolside/laguna-s-2.1:free                                  | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | poolside/laguna-xs-2.1                                      | 0.06      | 0.12       | OpenRouter published price                                                    |
| OPENROUTER  | poolside/laguna-xs-2.1:free                                 | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | prism-ml/ternary-bonsai-2-27b                               | 0.075     | 0.5        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen-2.5-72b-instruct                                  | 0.36      | 0.4        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen-2.5-coder-32b-instruct                            | 0.66      | 1          | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen-2.5-7b-instruct                                   | 0.1       | 0.2        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen2.5-vl-72b-instruct                                | 0.8       | 1          | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-14b                                              | 0.12      | 0.24       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-235b-a22b-2507                                   | 0.09      | 0.55       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-235b-a22b-thinking-2507                          | 0.45      | 3.5        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-30b-a3b                                          | 0.12      | 0.5        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-30b-a3b-instruct-2507                            | 0.1       | 0.3        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-32b                                              | 0.08      | 0.28       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.5-122b-a10b                                      | 0.26      | 2.08       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.5-27b                                            | 0.26      | 2.6        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.5-35b-a3b                                        | 0.14      | 1          | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.5-397b-a17b                                      | 0.5       | 3.6        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.5-9b                                             | 0.17      | 0.25       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.5-flash-02-23                                    | 0.065     | 0.26       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.5-plus-02-15                                     | 0.26      | 1.56       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.5-plus-20260420                                  | 0.3       | 1.8        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.6-27b                                            | 0.32      | 3.2        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.6-35b-a3b                                        | 0.1       | 0.9        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.6-flash                                          | 0.1875    | 1.125      | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.6-plus                                           | 0.325     | 1.95       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.7-flash                                          | 0.03      | 0.13       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.7-max                                            | 1.475     | 4.425      | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.7-plus                                           | 0.32      | 1.28       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.8-2.4t-a95b                                      | 2         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.8-27b                                            | 0.15      | 1.875      | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.8-flash                                          | 0.15      | 0.47       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.8-max-0902                                       | 2         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.8-max-prime                                      | 4         | 12         | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3.8-omni-flash                                     | 0.15      | 0.47       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-coder-30b-a3b-instruct                           | 0.07      | 0.28       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-coder                                            | 0.3       | 1          | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-coder-flash                                      | 0.195     | 0.975      | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-coder-next                                       | 0.12      | 0.8        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-next-80b-a3b-instruct                            | 0.09      | 1.1        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-vl-235b-a22b-instruct                            | 0.21      | 1.9        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-vl-30b-a3b-instruct                              | 0.15      | 0.6        | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-vl-30b-a3b-thinking                              | 0.29      | 1          | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen3-vl-8b-instruct                                   | 0.25      | 0.75       | OpenRouter published price                                                    |
| OPENROUTER  | qwen/qwen-plus                                              | 0.26      | 0.78       | OpenRouter published price                                                    |
| OPENROUTER  | rekaai/reka-edge                                            | 0.1       | 0.1        | OpenRouter published price                                                    |
| OPENROUTER  | rekaai/reka-flash-3                                         | 0.1       | 0.2        | OpenRouter published price                                                    |
| OPENROUTER  | relace/relace-apply-3                                       | 0.85      | 1.25       | OpenRouter published price                                                    |
| OPENROUTER  | relace/relace-search                                        | 1         | 3          | OpenRouter published price                                                    |
| OPENROUTER  | undi95/remm-slerp-l2-13b                                    | 0.35      | 0.65       | OpenRouter published price                                                    |
| OPENROUTER  | sakana/fugu-max                                             | 2         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | sakana/fugu-ultra                                           | 5         | 30         | OpenRouter published price                                                    |
| OPENROUTER  | sakana/fugu-ultra-v2                                        | 5         | 30         | OpenRouter published price                                                    |
| OPENROUTER  | sao10k/l3.1-euryale-70b                                     | 0.85      | 0.85       | OpenRouter published price                                                    |
| OPENROUTER  | sao10k/l3-lunaris-8b                                        | 0.04      | 0.05       | OpenRouter published price                                                    |
| OPENROUTER  | x-ai/grok-4.20                                              | 1.25      | 2.5        | OpenRouter published price                                                    |
| OPENROUTER  | x-ai/grok-4.3                                               | 1.25      | 2.5        | OpenRouter published price                                                    |
| OPENROUTER  | x-ai/grok-4.3:batch                                         | 1         | 2          | OpenRouter published price                                                    |
| OPENROUTER  | x-ai/grok-4.5                                               | 2         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | x-ai/grok-4.6                                               | 2         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | x-ai/grok-4.7                                               | 2         | 6          | OpenRouter published price                                                    |
| OPENROUTER  | x-ai/grok-build-0.1                                         | 1         | 2          | OpenRouter published price                                                    |
| OPENROUTER  | stepfun/step-3.5-flash                                      | 0.1       | 0.3        | OpenRouter published price                                                    |
| OPENROUTER  | stepfun/step-3.7-flash                                      | 0.2       | 1.15       | OpenRouter published price                                                    |
| OPENROUTER  | tencent/hunyuan-a13b-instruct                               | 0.14      | 0.57       | OpenRouter published price                                                    |
| OPENROUTER  | tencent/hy3                                                 | 0.0825    | 0.33       | OpenRouter published price                                                    |
| OPENROUTER  | tencent/hy3-preview                                         | 0.18      | 0.6        | OpenRouter published price                                                    |
| OPENROUTER  | tencent/hy4-preview                                         | 0.7506    | 2.2509     | OpenRouter published price                                                    |
| OPENROUTER  | tencent/hy-mt2-1.8b                                         | 0.044     | 0.177      | OpenRouter published price                                                    |
| OPENROUTER  | tencent/hy-mt2-30b-a3b                                      | 0.074     | 0.295      | OpenRouter published price                                                    |
| OPENROUTER  | tencent/hy-mt2-7b                                           | 0.074     | 0.295      | OpenRouter published price                                                    |
| OPENROUTER  | thedrummer/cydonia-24b-v4.1                                 | 0.3       | 0.5        | OpenRouter published price                                                    |
| OPENROUTER  | thedrummer/skyfall-36b-v2                                   | 0.55      | 0.8        | OpenRouter published price                                                    |
| OPENROUTER  | thedrummer/unslopnemo-12b                                   | 0.4       | 0.4        | OpenRouter published price                                                    |
| OPENROUTER  | thinkingmachines/inkling                                    | 1         | 4.05       | OpenRouter published price                                                    |
| OPENROUTER  | thinkingmachines/inkling:free                               | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | thinkingmachines/inkling-small                              | 0.45      | 1.2        | OpenRouter published price                                                    |
| OPENROUTER  | thinkingmachines/inkling-small:free                         | 0         | 0          | OpenRouter published price                                                    |
| OPENROUTER  | upstage/solar-mini4                                         | 0.05      | 0.2        | OpenRouter published price                                                    |
| OPENROUTER  | upstage/solar-pro4                                          | 0.15      | 0.6        | OpenRouter published price                                                    |
| OPENROUTER  | cognitivecomputations/dolphin-mistral-24b-venice-edition    | 0.2       | 0.9        | OpenRouter published price                                                    |
| OPENROUTER  | writer/palmyra-x5                                           | 0.6       | 6          | OpenRouter published price                                                    |
| OPENROUTER  | xiaomi/mimo-v2.5                                            | 0.4       | 2          | OpenRouter published price                                                    |
| OPENROUTER  | xiaomi/mimo-v2.5-pro                                        | 0.48      | 1.8        | OpenRouter published price                                                    |
| OPENROUTER  | xiaomi/mimo-v2.6-flash                                      | 0.14      | 0.28       | OpenRouter published price                                                    |
| OPENROUTER  | xiaomi/mimo-v2.6-pro                                        | 0.435     | 0.87       | OpenRouter published price                                                    |
| OPENROUTER  | xiaomi/mimo-v2.6-pro-ultraspeed                             | 4.35      | 8.7        | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-4.5                                                | 0.6       | 2.2        | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-4.5-air                                            | 0.13      | 0.85       | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-4.5v                                               | 0.6       | 1.8        | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-4.6                                                | 0.5       | 2          | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-4.6v                                               | 0.3       | 0.9        | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-4.7                                                | 0.54      | 1.98       | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-4.7-flash                                          | 0.0605    | 0.4        | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-5                                                  | 1         | 3.2        | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-5.1                                                | 1.4       | 4.4        | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-5.3                                                | 0.104     | 2.769      | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-5.3:batch                                          | 0.45      | 2          | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-5.3-flash                                          | 0.0197    | 0.1324     | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-5.3-flash:batch                                    | 0.05      | 0.18       | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-5.3-flashx                                         | 0.37      | 1.25       | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-5.3-prime                                          | 2.8       | 8.8        | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-5-turbo                                            | 1.2       | 4          | OpenRouter published price                                                    |
| OPENROUTER  | z-ai/glm-5v-turbo                                           | 1.2       | 4          | OpenRouter published price                                                    |
| GROQ        | allam-2-7b                                                  | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| GROQ        | openai/gpt-oss-120b                                         | 0.15      | 0.6        | same model on OpenRouter (openai/gpt-oss-120b)                                |
| GROQ        | openai/gpt-oss-20b                                          | 0.018     | 0.09       | same model on OpenRouter (openai/gpt-oss-20b)                                 |
| GROQ        | qwen/qwen3.8-27b                                            | 0.15      | 1.875      | same model on OpenRouter (qwen/qwen3.8-27b)                                   |
| HUGGINGFACE | zai-org/AutoGLM-Phone-9B-Multilingual                       | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| HUGGINGFACE | CohereLabs/aya-expanse-32b                                  | 0.2       | 0.4        | ESTIMATE: size tier 15-40B                                                    |
| HUGGINGFACE | CohereLabs/aya-vision-32b                                   | 0.2       | 0.4        | ESTIMATE: size tier 15-40B                                                    |
| HUGGINGFACE | speakleash/Bielik-11B-v3.0-Instruct                         | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| HUGGINGFACE | CohereLabs/c4ai-command-a-03-2025                           | 2.5       | 10         | Cohere official list price                                                    |
| HUGGINGFACE | CohereLabs/c4ai-command-r-08-2024                           | 0.15      | 0.6        | Cohere official list price                                                    |
| HUGGINGFACE | CohereLabs/c4ai-command-r7b-12-2024                         | 0.0375    | 0.15       | Cohere official list price                                                    |
| NVIDIANIM   | google/codegemma-1.1-7b                                     | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| NVIDIANIM   | google/codegemma-7b                                         | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| NVIDIANIM   | meta/codellama-70b                                          | 0.5       | 0.75       | ESTIMATE: size tier 41-100B                                                   |
| NVIDIANIM   | mistralai/codestral-22b-instruct-v0.1                       | 0.3       | 0.9        | Mistral official list price (codestral)                                       |
| HUGGINGFACE | CohereLabs/command-a-reasoning-08-2025                      | 2.5       | 10         | Cohere official list price                                                    |
| HUGGINGFACE | CohereLabs/command-a-translate-08-2025                      | 2.5       | 10         | Cohere official list price                                                    |
| NVIDIANIM   | nvidia/cosmos-reason2-8b                                    | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| NVIDIANIM   | databricks/dbrx-instruct                                    | 1.2       | 1.2        | ESTIMATE: 132B model, OpenRouter-era list price                               |
| NVIDIANIM   | deepseek-ai/deepseek-coder-6.7b-instruct                    | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| HUGGINGFACE | deepseek-ai/DeepSeek-R1-0528                                | 0.5       | 2.15       | same model on OpenRouter (deepseek/deepseek-r1-0528)                          |
| HUGGINGFACE | deepseek-ai/DeepSeek-V3-0324                                | 0.29      | 1.14       | same model on OpenRouter (deepseek/deepseek-chat-v3-0324)                     |
| HUGGINGFACE | deepseek-ai/DeepSeek-V3.1-Terminus                          | 0.27      | 1          | same model on OpenRouter (deepseek/deepseek-v3.1-terminus)                    |
| NVIDIANIM   | deepseek-ai/deepseek-v4.1-flash                             | 0.045     | 0.5        | same model on OpenRouter (deepseek/deepseek-v4.1-flash)                       |
| HUGGINGFACE | deepseek-ai/DeepSeek-V4.1-Flash                             | 0.045     | 0.5        | same model on OpenRouter (deepseek/deepseek-v4.1-flash)                       |
| HUGGINGFACE | deepseek-ai/DeepSeek-V4-Flash-0731                          | 0.119     | 0.238      | same model on OpenRouter (deepseek/deepseek-v4-flash-0731)                    |
| HUGGINGFACE | deepseek-ai/DeepSeek-V4-Flash-Vision-Exp                    | 0.2156    | 0.6468     | same model on OpenRouter (deepseek/deepseek-v4-flash-vision-exp)              |
| HUGGINGFACE | deepseek-ai/DeepSeek-V4-Pro                                 | 1.6       | 3.2        | same model on OpenRouter (deepseek/deepseek-v4-pro)                           |
| HUGGINGFACE | deepseek-ai/DeepSeek-V4-Pro-0813                            | 0.66      | 1.98       | same model on OpenRouter (deepseek/deepseek-v4-pro-0813)                      |
| NVIDIANIM   | google/diffusiongemma-26b-a4b-it                            | 0.2       | 0.4        | ESTIMATE: size tier 15-40B                                                    |
| NVIDIANIM   | google/gemma-2b                                             | 0.05      | 0.1        | ESTIMATE: size tier <=4B                                                      |
| NVIDIANIM   | google/gemma-3-12b-it                                       | 0.05      | 0.15       | same model on OpenRouter (google/gemma-3-12b-it)                              |
| HUGGINGFACE | google/gemma-3-12b-it                                       | 0.05      | 0.15       | same model on OpenRouter (google/gemma-3-12b-it)                              |
| HUGGINGFACE | google/gemma-3-27b-it                                       | 0.08      | 0.35       | same model on OpenRouter (google/gemma-3-27b-it)                              |
| NVIDIANIM   | google/gemma-3-4b-it                                        | 0.05      | 0.1        | same model on OpenRouter (google/gemma-3-4b-it)                               |
| HUGGINGFACE | google/gemma-3-4b-it                                        | 0.05      | 0.1        | same model on OpenRouter (google/gemma-3-4b-it)                               |
| HUGGINGFACE | google/gemma-4-26B-A4B-it                                   | 0.0675    | 0.225      | same model on OpenRouter (google/gemma-4-26b-a4b-it)                          |
| NVIDIANIM   | google/gemma-4-31b-it                                       | 0.2       | 0.4        | same model on OpenRouter (google/gemma-4-31b-it)                              |
| HUGGINGFACE | google/gemma-4-31B-it                                       | 0.2       | 0.4        | same model on OpenRouter (google/gemma-4-31b-it)                              |
| HUGGINGFACE | zai-org/GLM-4.5-Air                                         | 0.13      | 0.85       | same model on OpenRouter (z-ai/glm-4.5-air)                                   |
| HUGGINGFACE | zai-org/GLM-4.5V                                            | 0.6       | 1.8        | same model on OpenRouter (z-ai/glm-4.5v)                                      |
| HUGGINGFACE | zai-org/GLM-4.5V-FP8                                        | 0.6       | 1.8        | same model on OpenRouter (z-ai/glm-4.5v)                                      |
| HUGGINGFACE | zai-org/GLM-4.6                                             | 0.5       | 2          | same model on OpenRouter (z-ai/glm-4.6)                                       |
| HUGGINGFACE | zai-org/GLM-4.6V                                            | 0.3       | 0.9        | same model on OpenRouter (z-ai/glm-4.6v)                                      |
| HUGGINGFACE | zai-org/GLM-4.6V-Flash                                      | 0.1       | 0.2        | ESTIMATE: 9B vision model, size tier 5-14B                                    |
| HUGGINGFACE | zai-org/GLM-4.6V-FP8                                        | 0.3       | 0.9        | same model on OpenRouter (z-ai/glm-4.6v)                                      |
| HUGGINGFACE | zai-org/GLM-4.7                                             | 0.54      | 1.98       | same model on OpenRouter (z-ai/glm-4.7)                                       |
| HUGGINGFACE | zai-org/GLM-4.7-Flash                                       | 0.0605    | 0.4        | same model on OpenRouter (z-ai/glm-4.7-flash)                                 |
| HUGGINGFACE | zai-org/GLM-5                                               | 1         | 3.2        | same model on OpenRouter (z-ai/glm-5)                                         |
| HUGGINGFACE | zai-org/GLM-5.3                                             | 0.104     | 2.769      | same model on OpenRouter (z-ai/glm-5.3)                                       |
| HUGGINGFACE | zai-org/GLM-5.3-BF16                                        | 0.104     | 2.769      | same model on OpenRouter (z-ai/glm-5.3)                                       |
| NVIDIANIM   | z-ai/glm-5.3-flash                                          | 0.0197    | 0.1324     | same model on OpenRouter (z-ai/glm-5.3-flash)                                 |
| HUGGINGFACE | zai-org/GLM-5.3-Flash                                       | 0.0197    | 0.1324     | same model on OpenRouter (z-ai/glm-5.3-flash)                                 |
| HUGGINGFACE | zai-org/GLM-5.3-Flash-BF16                                  | 0.0197    | 0.1324     | same model on OpenRouter (z-ai/glm-5.3-flash)                                 |
| HUGGINGFACE | openai/gpt-oss-120b                                         | 0.15      | 0.6        | same model on OpenRouter (openai/gpt-oss-120b)                                |
| HUGGINGFACE | openai/gpt-oss-20b                                          | 0.018     | 0.09       | same model on OpenRouter (openai/gpt-oss-20b)                                 |
| NVIDIANIM   | openai/gpt-oss-20b                                          | 0.018     | 0.09       | same model on OpenRouter (openai/gpt-oss-20b)                                 |
| NVIDIANIM   | ibm/granite-3.0-3b-a800m-instruct                           | 0.05      | 0.1        | ESTIMATE: size tier <=4B                                                      |
| NVIDIANIM   | ibm/granite-3.0-8b-instruct                                 | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| NVIDIANIM   | ibm/granite-34b-code-instruct                               | 0.2       | 0.4        | ESTIMATE: size tier 15-40B                                                    |
| HUGGINGFACE | ibm-granite/granite-4.2-30b                                 | 0.2       | 0.4        | ESTIMATE: size tier 15-40B                                                    |
| HUGGINGFACE | ibm-granite/granite-4.2-3b                                  | 0.05      | 0.1        | ESTIMATE: size tier <=4B                                                      |
| HUGGINGFACE | ibm-granite/granite-4.2-8b                                  | 0.06      | 0.15       | same model on OpenRouter (ibm-granite/granite-4.2-8b)                         |
| NVIDIANIM   | ibm/granite-8b-code-instruct                                | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| HUGGINGFACE | NousResearch/Hermes-3-Llama-3.1-70B                         | 0.7       | 0.7        | same model on OpenRouter (nousresearch/hermes-3-llama-3.1-70b)                |
| HUGGINGFACE | tencent/Hy3                                                 | 0.0825    | 0.33       | same model on OpenRouter (tencent/hy3)                                        |
| HUGGINGFACE | tencent/Hy4-preview                                         | 0.7506    | 2.2509     | same model on OpenRouter (tencent/hy4-preview)                                |
| HUGGINGFACE | thinkingmachines/Inkling                                    | 1         | 4.05       | same model on OpenRouter (thinkingmachines/inkling)                           |
| HUGGINGFACE | thinkingmachines/Inkling-Small                              | 0.45      | 1.2        | same model on OpenRouter (thinkingmachines/inkling-small)                     |
| NVIDIANIM   | ai21labs/jamba-1.5-large-instruct                           | 2         | 8          | AI21 official list price                                                      |
| HUGGINGFACE | moonshotai/Kimi-K2.5                                        | 0.5       | 2.5        | same model on OpenRouter (moonshotai/kimi-k2.5)                               |
| NVIDIANIM   | moonshotai/kimi-k2.6                                        | 0.65      | 3.41       | same model on OpenRouter (moonshotai/kimi-k2.6)                               |
| HUGGINGFACE | moonshotai/Kimi-K2.6                                        | 0.65      | 3.41       | same model on OpenRouter (moonshotai/kimi-k2.6)                               |
| HUGGINGFACE | moonshotai/Kimi-K2.7-Code                                   | 0.6       | 3.5        | same model on OpenRouter (moonshotai/kimi-k2.7-code)                          |
| HUGGINGFACE | moonshotai/Kimi-K2-Instruct-0905                            | 0.6       | 2.5        | same model on OpenRouter (moonshotai/kimi-k2-0905)                            |
| AI_HORDE    | koboldcpp/Gemma-4-E4B-it-Ultra-Uncensored-Heretic           | 0         | 0          | free volunteer GPUs, no platform cost                                         |
| AI_HORDE    | koboldcpp/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive-Q4_K_M | 0         | 0          | free volunteer GPUs, no platform cost                                         |
| AI_HORDE    | koboldcpp/L3-8B-Stheno-v3.2                                 | 0         | 0          | free volunteer GPUs, no platform cost                                         |
| AI_HORDE    | koboldcpp/Qwen_Qwen3-0.6B-IQ4_XS                            | 0         | 0          | free volunteer GPUs, no platform cost                                         |
| HUGGINGFACE | Sao10K/L3-8B-Stheno-v3.2                                    | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| NVIDIANIM   | poolside/laguna-xs-2.1                                      | 0.06      | 0.12       | same model on OpenRouter (poolside/laguna-xs-2.1)                             |
| HUGGINGFACE | inclusionAI/Ling-3.0-flash                                  | 0.021     | 0.063      | same model on OpenRouter (inclusionai/ling-3.0-flash)                         |
| HUGGINGFACE | inclusionAI/Ling-3.0-flash-Fin                              | 0.021     | 0.063      | same as Ling-3.0-flash                                                        |
| HUGGINGFACE | inclusionAI/Ling-3.0-flash-VL                               | 0.06      | 0.18       | same model on OpenRouter (inclusionai/ling-3.0-flash-vl)                      |
| NVIDIANIM   | meta/llama2-70b                                             | 0.5       | 0.75       | ESTIMATE: size tier 41-100B                                                   |
| HUGGINGFACE | meta-llama/Llama-3.1-8B-Instruct                            | 0.05      | 0.08       | same model on OpenRouter (meta-llama/llama-3.1-8b-instruct)                   |
| NVIDIANIM   | nvidia/llama-3.1-nemotron-51b-instruct                      | 0.5       | 0.75       | ESTIMATE: size tier 41-100B                                                   |
| NVIDIANIM   | nvidia/llama-3.1-nemotron-70b-instruct                      | 0.5       | 0.75       | ESTIMATE: size tier 41-100B                                                   |
| NVIDIANIM   | nvidia/llama-3.1-nemotron-ultra-253b-v1                     | 0.8       | 2.4        | ESTIMATE: size tier 101-300B                                                  |
| NVIDIANIM   | meta/llama-3.2-11b-vision-instruct                          | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| NVIDIANIM   | meta/llama-3.2-90b-vision-instruct                          | 0.5       | 0.75       | ESTIMATE: size tier 41-100B                                                   |
| HUGGINGFACE | meta-llama/Llama-3.3-70B-Instruct                           | 0.1       | 0.32       | same model on OpenRouter (meta-llama/llama-3.3-70b-instruct)                  |
| NVIDIANIM   | nvidia/llama3-chatqa-1.5-70b                                | 0.5       | 0.75       | ESTIMATE: size tier 41-100B                                                   |
| HUGGINGFACE | meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8           | 0.15      | 0.6        | OpenRouter llama-4-maverick                                                   |
| HUGGINGFACE | meta-llama/Llama-4-Scout-17B-16E-Instruct                   | 0.08      | 0.3        | OpenRouter llama-4-scout                                                      |
| HUGGINGFACE | XiaomiMiMo/MiMo-V2.5                                        | 0.4       | 2          | same model on OpenRouter (xiaomi/mimo-v2.5)                                   |
| HUGGINGFACE | XiaomiMiMo/MiMo-V2.5-Pro                                    | 0.48      | 1.8        | same model on OpenRouter (xiaomi/mimo-v2.5-pro)                               |
| HUGGINGFACE | MiniMaxAI/MiniMax-M1-80k                                    | 0.4       | 2.2        | MiniMax official list price                                                   |
| HUGGINGFACE | MiniMaxAI/MiniMax-M2.5                                      | 0.3       | 1.2        | same model on OpenRouter (minimax/minimax-m2.5)                               |
| HUGGINGFACE | MiniMaxAI/MiniMax-M2.7                                      | 0.3       | 1.2        | same model on OpenRouter (minimax/minimax-m2.7)                               |
| HUGGINGFACE | MiniMaxAI/MiniMax-M3                                        | 0.3       | 1.2        | same model on OpenRouter (minimax/minimax-m3)                                 |
| NVIDIANIM   | mistralai/mistral-7b-instruct-v0.3                          | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| NVIDIANIM   | mistralai/mistral-large                                     | 2         | 6          | same model on OpenRouter (mistralai/mistral-large)                            |
| NVIDIANIM   | mistralai/mistral-large-2-instruct                          | 2         | 6          | Mistral official list price (mistral-large)                                   |
| NVIDIANIM   | nv-mistralai/mistral-nemo-12b-instruct                      | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| NVIDIANIM   | nvidia/mistral-nemo-minitron-8b-8k-instruct                 | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| NVIDIANIM   | mistralai/mixtral-8x22b-v0.1                                | 0.2       | 0.4        | ESTIMATE: size tier 15-40B                                                    |
| NVIDIANIM   | meta/muse-glimmer-30b                                       | 0.3       | 1.2        | same model on OpenRouter (meta/muse-glimmer-30b)                              |
| HUGGINGFACE | meta-models/Muse-Glimmer-30B                                | 0.3       | 1.2        | same model on OpenRouter (meta/muse-glimmer-30b)                              |
| NVIDIANIM   | nvidia/nemotron-3.5-content-safety                          | 0.2       | 0.2        | same model on OpenRouter (nvidia/nemotron-3.5-content-safety)                 |
| NVIDIANIM   | nvidia/nemotron-3.5-lightning-30b-a3b                       | 0.2       | 0.4        | ESTIMATE: size tier 15-40B                                                    |
| NVIDIANIM   | nvidia/nemotron-3-nano-omni-30b-a3b-reasoning               | 0         | 0          | same model on OpenRouter (nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free) |
| NVIDIANIM   | nvidia/nemotron-3-super-120b-a12b                           | 0.3       | 2.4        | same model on OpenRouter (nvidia/nemotron-3-super-120b-a12b)                  |
| NVIDIANIM   | nvidia/nemotron-3-ultra-550b-a55b                           | 0.6       | 2.4        | same model on OpenRouter (nvidia/nemotron-3-ultra-550b-a55b)                  |
| NVIDIANIM   | nvidia/nemotron-4-340b-instruct                             | 1         | 3          | ESTIMATE: size tier >300B                                                     |
| NVIDIANIM   | nvidia/nemotron-nano-3-30b-a3b                              | 0.2       | 0.4        | ESTIMATE: size tier 15-40B                                                    |
| NVIDIANIM   | writer/palmyra-creative-122b                                | 0.8       | 2.4        | ESTIMATE: size tier 101-300B                                                  |
| NVIDIANIM   | writer/palmyra-fin-70b-32k                                  | 0.5       | 0.75       | ESTIMATE: size tier 41-100B                                                   |
| NVIDIANIM   | writer/palmyra-med-70b                                      | 0.5       | 0.75       | ESTIMATE: size tier 41-100B                                                   |
| NVIDIANIM   | writer/palmyra-med-70b-32k                                  | 0.5       | 0.75       | ESTIMATE: size tier 41-100B                                                   |
| NVIDIANIM   | microsoft/phi-3.5-moe-instruct                              | 0.15      | 0.3        | ESTIMATE: 42B MoE, size tier                                                  |
| NVIDIANIM   | microsoft/phi-3-vision-128k-instruct                        | 0.05      | 0.1        | ESTIMATE: 4B vision model, size tier <=4B                                     |
| HUGGINGFACE | microsoft/phi-4                                             | 0.07      | 0.14       | same model on OpenRouter (microsoft/phi-4)                                    |
| HUGGINGFACE | Qwen/Qwen3-14B                                              | 0.12      | 0.24       | same model on OpenRouter (qwen/qwen3-14b)                                     |
| HUGGINGFACE | Qwen/Qwen3-235B-A22B-Instruct-2507                          | 0.09      | 0.55       | same model on OpenRouter (qwen/qwen3-235b-a22b-2507)                          |
| HUGGINGFACE | Qwen/Qwen3-30B-A3B                                          | 0.12      | 0.5        | same model on OpenRouter (qwen/qwen3-30b-a3b)                                 |
| HUGGINGFACE | Qwen/Qwen3-32B                                              | 0.08      | 0.28       | same model on OpenRouter (qwen/qwen3-32b)                                     |
| HUGGINGFACE | Qwen/Qwen3.5-122B-A10B                                      | 0.26      | 2.08       | same model on OpenRouter (qwen/qwen3.5-122b-a10b)                             |
| HUGGINGFACE | Qwen/Qwen3.5-27B                                            | 0.26      | 2.6        | same model on OpenRouter (qwen/qwen3.5-27b)                                   |
| HUGGINGFACE | Qwen/Qwen3.5-35B-A3B                                        | 0.14      | 1          | same model on OpenRouter (qwen/qwen3.5-35b-a3b)                               |
| HUGGINGFACE | Qwen/Qwen3.5-397B-A17B                                      | 0.5       | 3.6        | same model on OpenRouter (qwen/qwen3.5-397b-a17b)                             |
| HUGGINGFACE | Qwen/Qwen3.5-9B                                             | 0.17      | 0.25       | same model on OpenRouter (qwen/qwen3.5-9b)                                    |
| HUGGINGFACE | Qwen/Qwen3.6-27B                                            | 0.32      | 3.2        | same model on OpenRouter (qwen/qwen3.6-27b)                                   |
| HUGGINGFACE | Qwen/Qwen3.6-35B-A3B                                        | 0.1       | 0.9        | same model on OpenRouter (qwen/qwen3.6-35b-a3b)                               |
| HUGGINGFACE | Qwen/Qwen3.8-2.4T-A95B                                      | 2         | 6          | same model on OpenRouter (qwen/qwen3.8-2.4t-a95b)                             |
| HUGGINGFACE | Qwen/Qwen3.8-27B                                            | 0.15      | 1.875      | same model on OpenRouter (qwen/qwen3.8-27b)                                   |
| HUGGINGFACE | Qwen/Qwen3-Next-80B-A3B-Instruct                            | 0.09      | 1.1        | same model on OpenRouter (qwen/qwen3-next-80b-a3b-instruct)                   |
| HUGGINGFACE | Qwen/Qwen3-VL-30B-A3B-Instruct                              | 0.15      | 0.6        | same model on OpenRouter (qwen/qwen3-vl-30b-a3b-instruct)                     |
| NVIDIANIM   | google/recurrentgemma-2b                                    | 0.05      | 0.1        | ESTIMATE: size tier <=4B                                                      |
| NVIDIANIM   | nvidia/riva-translate-4b-instruct                           | 0.05      | 0.1        | ESTIMATE: size tier <=4B                                                      |
| NVIDIANIM   | nvidia/riva-translate-4b-instruct-v2                        | 0.05      | 0.1        | ESTIMATE: size tier <=4B                                                      |
| NVIDIANIM   | aisingapore/sea-lion-7b-instruct                            | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
| NVIDIANIM   | bigcode/starcoder2-15b                                      | 0.2       | 0.4        | ESTIMATE: size tier 15-40B                                                    |
| HUGGINGFACE | CohereLabs/tiny-aya-earth                                   | 0.05      | 0.1        | ESTIMATE: 3B model, size tier <=4B                                            |
| HUGGINGFACE | CohereLabs/tiny-aya-fire                                    | 0.05      | 0.1        | ESTIMATE: 3B model, size tier <=4B                                            |
| HUGGINGFACE | CohereLabs/tiny-aya-global                                  | 0.05      | 0.1        | ESTIMATE: 3B model, size tier <=4B                                            |
| HUGGINGFACE | CohereLabs/tiny-aya-water                                   | 0.05      | 0.1        | ESTIMATE: 3B model, size tier <=4B                                            |
| NVIDIANIM   | 01-ai/yi-large                                              | 3         | 3          | 01.AI list price                                                              |
| NVIDIANIM   | zyphra/zamba2-7b-instruct                                   | 0.1       | 0.2        | ESTIMATE: size tier 5-14B                                                     |
