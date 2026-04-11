# Cost Model

## Overview

ClawAI's cost model combines free local inference with paid cloud API calls. The platform's intelligent routing optimizes cost by directing simple tasks to free local models and reserving expensive cloud models for tasks that require their capabilities.

---

## Cost Components

### Local Inference: $0

Local Ollama models run on the user's own hardware. There is no per-token or per-request cost.

| Model | Parameters | RAM Required | Cost Per Token |
| --- | --- | --- | --- |
| gemma3:4b | 4B | 4-6 GB | $0 |
| llama3.2:3b | 3B | 3-4 GB | $0 |
| phi3:mini | 3.8B | 3-5 GB | $0 |
| gemma2:2b | 2B | 2-3 GB | $0 |
| tinyllama | 1.1B | 1-2 GB | $0 |
| Any catalog model | 1.7B-32B | 2-24 GB | $0 |

**Hardware costs** (one-time): GPU-capable machine or high-RAM CPU system. Runs on existing developer machines in most cases.

### Cloud API Costs (Per-Token)

Approximate pricing as of early 2026 (varies by provider):

| Provider | Model | Input (per 1M tokens) | Output (per 1M tokens) |
| --- | --- | --- | --- |
| OpenAI | GPT-4o-mini | ~$0.15 | ~$0.60 |
| OpenAI | GPT-4o | ~$2.50 | ~$10.00 |
| Anthropic | Claude Sonnet 4 | ~$3.00 | ~$15.00 |
| Anthropic | Claude Opus 4 | ~$15.00 | ~$75.00 |
| Google | Gemini 2.5 Flash | ~$0.15 | ~$0.60 |
| Google | Gemini 2.5 Pro | ~$1.25 | ~$5.00 |
| DeepSeek | DeepSeek Chat | ~$0.14 | ~$0.28 |

### Image Generation Costs

| Provider | Model | Cost Per Image |
| --- | --- | --- |
| OpenAI | DALL-E 3 | ~$0.04-0.08 |
| Google | Gemini Image | Varies |
| Local | Stable Diffusion | $0 |

### Infrastructure Costs

| Component | Development | Production |
| --- | --- | --- |
| Compute | Existing machine | Cloud VM or bare metal |
| Storage | Local disk | SSD (databases grow ~1GB/month per active user) |
| GPU (optional) | Developer GPU | Dedicated GPU node for Ollama |
| Network | Local only | Outbound HTTPS to cloud providers |

---

## Cost Optimization Through Routing

### Routing Mode Cost Impact

| Mode | Strategy | Typical Cost |
| --- | --- | --- |
| AUTO | Routes simple tasks locally, complex to cloud | Moderate |
| MANUAL_MODEL | User selects (may pick expensive models) | Variable |
| LOCAL_ONLY | Everything local | $0 |
| PRIVACY_FIRST | Local preferred, Anthropic fallback | Low |
| LOW_LATENCY | GPT-4o-mini | Low |
| HIGH_REASONING | Claude Opus 4 | High |
| COST_SAVER | Local when healthy, cheapest cloud otherwise | Lowest |

### AUTO Mode Cost Savings

Based on typical usage patterns:

| Query Type | % of Queries | Without ClawAI | With ClawAI AUTO |
| --- | --- | --- | --- |
| Simple Q&A, greetings | 30% | Cloud ($) | Local ($0) |
| General chat, summaries | 25% | Cloud ($) | Local or cheap cloud |
| Coding tasks | 20% | Cloud ($$) | Cloud ($$) -- same |
| Data analysis | 10% | Cloud ($$) | Cloud ($$) -- same |
| Complex reasoning | 10% | Cloud ($$$) | Cloud ($$$) -- same |
| Privacy-sensitive | 5% | Cloud ($) | Local ($0) |

**Estimated savings**: 30-50% compared to routing everything to a single premium cloud provider.

### Cost Calculation Example

**Scenario**: Team of 10 developers, 100 messages per day per developer.

**Without ClawAI** (all to Claude Sonnet 4):
- 1,000 messages/day x ~2,000 tokens average = 2M tokens/day
- Input: 1M tokens x $3.00 = $3.00/day
- Output: 1M tokens x $15.00 = $15.00/day
- **Monthly: ~$540**

**With ClawAI AUTO routing**:
- 30% simple (local, $0) = 300 messages x $0 = $0
- 25% general (GPT-4o-mini) = 250 messages x ~$0.001 = $0.25/day
- 20% coding (Claude Sonnet) = 200 messages x ~$0.02 = $4.00/day
- 10% data (Gemini Flash) = 100 messages x ~$0.001 = $0.10/day
- 10% reasoning (Claude Opus) = 100 messages x ~$0.09 = $9.00/day
- 5% privacy (local, $0) = 50 messages x $0 = $0
- **Monthly: ~$402** (26% savings)

**With COST_SAVER mode for non-critical threads**:
- Even more queries routed locally
- **Monthly: ~$200-250** (50%+ savings)

---

## Usage Tracking

ClawAI tracks all costs through the Usage Ledger in the audit service:

| Metric | Tracked | Dimension |
| --- | --- | --- |
| Input tokens | Yes | Per provider, per model, per user |
| Output tokens | Yes | Per provider, per model, per user |
| API calls | Yes | Per provider |
| Latency | Yes | Per provider, per model |
| Image generations | Yes | Per provider |
| File generations | Yes | Per format |

### Usage Dashboard

Admins can view:
- Token consumption by provider (bar chart)
- Cost breakdown by provider (pie chart)
- Trend over time (line chart)
- Per-user consumption
- Model distribution
- Cost per routing mode

---

## Model Size vs Quality Tradeoffs

| Model Tier | Parameters | Quality | Speed | Cost | Best For |
| --- | --- | --- | --- | --- | --- |
| Tiny (1-2B) | 1-2B | Basic | Very fast | $0 (local) | Simple Q&A, routing |
| Small (3-4B) | 3-4B | Good | Fast | $0 (local) | General chat, translations |
| Medium (7-9B) | 7-9B | Strong | Moderate | $0 (local) | Coding, analysis |
| Large (14-16B) | 14-16B | Very good | Slower | $0 (local) | Complex coding, reasoning |
| XL (27-32B) | 27-32B | Excellent | Slow | $0 (local) | Best local quality |
| Cloud Small | -- | Good | Fast | $ | General purpose |
| Cloud Medium | -- | Very good | Fast | $$ | Coding, analysis |
| Cloud Large | -- | Excellent | Moderate | $$$ | Deep reasoning, complex analysis |

---

## Recommendations

### For Cost-Conscious Teams
1. Start with COST_SAVER mode as default
2. Install the 5 default local models (8.7 GB total)
3. Use LOCAL_ONLY for simple Q&A and privacy-sensitive work
4. Reserve cloud for tasks where quality difference is significant
5. Review usage dashboard weekly to identify optimization opportunities

### For Quality-Focused Teams
1. Use AUTO mode as default
2. Install specialized local models (coding, reasoning)
3. Configure routing policies to use best providers per task type
4. Use HIGH_REASONING only for truly complex tasks
5. Monitor routing decisions to validate model selections

### For Privacy-First Organizations
1. Default to PRIVACY_FIRST mode
2. Install larger local models for better local quality
3. Create routing policies to force LOCAL_ONLY for sensitive topics
4. Audit routing decisions regularly to verify compliance
5. Local models have zero cloud cost and zero data exposure
