# God Mode Routing Specification

Version: 1.0.0
Status: Draft
Author: ClawAI Architecture Team
Date: 2026-04-11

---

## Section 1: Repository and Architecture Grounding

### System Context

ClawAI is a local-first AI orchestration platform comprising 13 NestJS microservices, a Next.js 16 frontend, 9 PostgreSQL databases (with pgvector), MongoDB, Redis, RabbitMQ, and Ollama. All traffic flows through Nginx (port 4000) to backend services (ports 4001-4013).

The routing engine lives in `claw-routing-service` (port 4004, database `claw_routing`) and is the single decision authority for every user message. It determines which provider and model handles a request based on message content, user preferences, connector health, and active policies.

### Current Routing Architecture

```
User Message
  |
  v
RoutingManager.evaluateRoute()
  |
  +-- applyPolicies()           // Check active RoutingPolicy overrides
  |
  +-- Switch on RoutingMode:
  |     MANUAL_MODEL  -> user-forced provider/model
  |     LOCAL_ONLY    -> category-aware local model selection
  |     PRIVACY_FIRST -> local if healthy, else Anthropic
  |     LOW_LATENCY   -> OpenAI gpt-4o-mini
  |     HIGH_REASONING-> Anthropic claude-opus-4
  |     COST_SAVER    -> local if healthy, else cheapest cloud
  |     AUTO          -> multi-stage pipeline (below)
  |
  +-- AUTO pipeline:
        1. detectImageRequest()         // 100+ image keywords, verb+noun combos, art style indicators
        2. detectFileGenerationRequest() // verb+format combos, exact phrase matches
        3. detectCategoryRoute()         // 64 keywords -> LOCAL_CODING/LOCAL_REASONING/LOCAL_THINKING
        4. OllamaRouterManager.route()   // LLM-assisted routing with dynamic prompt
        5. handleAutoHeuristic()         // message length + connector availability fallback
```

### Current Keyword Detection

| Category | Keyword Count | Source Constant | Example Keywords |
|----------|--------------|-----------------|------------------|
| Image Generation | 100+ | `IMAGE_KEYWORDS` + verb/noun combos + art style indicators | generate image, draw, paint, portrait, photorealistic, cyberpunk |
| File Generation | 9 verbs x 18 formats + 7 exact phrases | `FILE_GENERATION_VERBS` x `FILE_GENERATION_FORMAT_WORDS` + `FILE_GENERATION_KEYWORDS` | generate pdf, create csv, export as, save to file |
| Coding | 28 | `CODING_KEYWORDS` | code, debug, function, refactor, typescript, react, sql |
| Reasoning | 21 | `REASONING_KEYWORDS` | prove, solve, calculate, theorem, chain of thought |
| Thinking | 15 | `THINKING_KEYWORDS` | research, investigate, compare and contrast, deep dive |

### Current Model Catalog

30 models across 6 categories, seeded from `apps/claw-ollama-service/prisma/seed-catalog.ts`:

| Category | Count | Runtimes | Example Models |
|----------|-------|----------|----------------|
| CODING | 5 | Ollama | Qwen 2.5 Coder 32B/14B/7B, DeepSeek Coder V2 16B, StarCoder2 7B |
| FILE_GENERATION | 5 | Ollama | Qwen 3 7B, Llama 3.3 8B, Mistral Small 3 7B, Phi-4 14B, Gemma 3 9B |
| IMAGE_GENERATION | 5 | ComfyUI | FLUX.2 Dev, FLUX.1 Schnell, SD 3.5, SDXL-Lightning, Z-Image-Turbo |
| ROUTING | 5 | Ollama | Qwen 3 1.7B, Phi-4-mini 3.8B, SmolLM2 1.7B, Gemma 3 4B, Mistral Small 3 7B |
| REASONING | 5 | Ollama | DeepSeek R1 32B/14B/7B, QwQ 32B, Phi-4 14B |
| THINKING | 5 | Ollama | GLM-4.7 Thinking, DeepSeek V3.2, MiMo-V2-Flash, Qwen 3.5 27B, Llama 4 Maverick |

### Current Provider Registry

| Provider Constant | Type | Models |
|-------------------|------|--------|
| `local-ollama` | Local runtime | gemma3:4b, llama3.2:3b, phi3:mini, gemma2:2b, tinyllama + catalog models |
| `OPENAI` | Cloud connector | gpt-4o-mini |
| `ANTHROPIC` | Cloud connector | claude-sonnet-4, claude-opus-4 |
| `GEMINI` | Cloud connector | gemini-2.5-flash |
| `DEEPSEEK` | Cloud connector | deepseek-chat |
| `IMAGE_OPENAI` | Image generation | dall-e-3 |
| `IMAGE_GEMINI` | Image generation | gemini-2.5-flash-image |
| `IMAGE_LOCAL` | Image generation | sdxl-turbo |
| `FILE_GENERATION` | File export | auto (model selected by file-gen service) |

### Current Model Role Assignments

Defined in `packages/shared-types/src/enums/local-model-role.enum.ts`:

| Role | Purpose | Default Model |
|------|---------|---------------|
| `ROUTER` | Makes AUTO routing decisions | gemma3:4b |
| `LOCAL_FALLBACK_CHAT` | Default local chat | gemma3:4b |
| `LOCAL_CODING` | Code generation/review | (user-assigned from catalog) |
| `LOCAL_REASONING` | Chain-of-thought, math | (user-assigned from catalog) |
| `LOCAL_FILE_GENERATION` | Structured output for files | (user-assigned from catalog) |
| `LOCAL_THINKING` | Agentic/research/search | (user-assigned from catalog) |
| `LOCAL_IMAGE_GENERATION` | Local diffusion model | (user-assigned from catalog) |

### PromptBuilderManager

Located at `apps/claw-routing-service/src/modules/routing/managers/prompt-builder.manager.ts`. Dynamically builds the Ollama router prompt from installed models:

- Fetches installed models from `ollama-service` internal API (`/api/v1/internal/ollama/installed-models`)
- Groups by category, includes roles and parameter counts
- 5-minute TTL cache, invalidated on MODEL_PULLED/MODEL_DELETED events
- Falls back to static `ROUTER_PROMPT_TEMPLATE` if no installed models found

### Key File Locations

| File | Purpose |
|------|---------|
| `apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts` | Core routing logic (802 lines) |
| `apps/claw-routing-service/src/modules/routing/managers/ollama-router.manager.ts` | LLM-assisted routing |
| `apps/claw-routing-service/src/modules/routing/managers/prompt-builder.manager.ts` | Dynamic prompt construction |
| `apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts` | All keywords, providers, models, templates |
| `apps/claw-routing-service/src/modules/routing/types/routing.types.ts` | RoutingContext, RoutingDecisionResult, FallbackEntry |
| `apps/claw-routing-service/src/modules/routing/types/installed-model.types.ts` | InstalledModelInfo, CachedPromptData |
| `apps/claw-ollama-service/prisma/seed-catalog.ts` | 30-model catalog seed |
| `packages/shared-types/src/enums/local-model-role.enum.ts` | 7 model role enums |

---

## Section 2: Role-to-Job Mapping (50 Roles)

God Mode routing maps 50 professional roles to capability classes, modality requirements, and executor preferences. Each role belongs to a cluster that shares detection keywords and routing behavior.

### Role Master Table

| # | Role | Cluster | Primary Capability | Modality | Latency Tolerance | Sensitivity | Best Executor |
|---|------|---------|-------------------|----------|-------------------|-------------|---------------|
| 1 | Software Engineer | Engineering | CODE_GENERATION | text | medium (<10s) | low | Anthropic claude-sonnet-4 or LOCAL_CODING |
| 2 | Frontend Engineer | Engineering | CODE_GENERATION | text | medium (<10s) | low | Anthropic claude-sonnet-4 or LOCAL_CODING |
| 3 | Backend Engineer | Engineering | CODE_GENERATION | text | medium (<10s) | low | Anthropic claude-sonnet-4 or LOCAL_CODING |
| 4 | Full-Stack Engineer | Engineering | CODE_GENERATION | text | medium (<10s) | low | Anthropic claude-sonnet-4 or LOCAL_CODING |
| 5 | DevOps Engineer | Engineering | INFRASTRUCTURE | text | medium (<10s) | medium | Anthropic claude-sonnet-4 or LOCAL_CODING |
| 6 | SRE | Engineering | INFRASTRUCTURE | text | low (<2s) | medium | Anthropic claude-sonnet-4 |
| 7 | Cloud Architect | Engineering | INFRASTRUCTURE | text | high (<60s) | medium | Anthropic claude-opus-4 |
| 8 | Security Engineer | Engineering | CODE_REVIEW | text | medium (<10s) | high | LOCAL_CODING (never cloud for audit code) |
| 9 | Penetration Tester | Engineering | DEBUGGING | text | medium (<10s) | critical | LOCAL_CODING (never cloud) |
| 10 | QA Engineer | Engineering | CODE_GENERATION | text | medium (<10s) | low | Anthropic claude-sonnet-4 or LOCAL_CODING |
| 11 | Automation Tester | Engineering | CODE_GENERATION | text | medium (<10s) | low | LOCAL_CODING or Anthropic |
| 12 | UAT Specialist | Engineering | TECHNICAL_WRITING | text | high (<60s) | low | LOCAL_FILE_GENERATION or Anthropic |
| 13 | Data Engineer | Data | DATA_ANALYSIS | text | medium (<10s) | medium | Gemini gemini-2.5-flash or LOCAL_CODING |
| 14 | Data Analyst | Data | DATA_ANALYSIS | text | medium (<10s) | medium | Gemini gemini-2.5-flash |
| 15 | Data Scientist | Data | MATH_REASONING | text | high (<60s) | medium | DeepSeek or LOCAL_REASONING |
| 16 | ML Engineer | Data | CODE_GENERATION | text | high (<60s) | medium | Anthropic claude-sonnet-4 or LOCAL_CODING |
| 17 | Prompt Engineer | Data | CREATIVE_WRITING | text | medium (<10s) | low | OpenAI gpt-4o-mini |
| 18 | Research Scientist | Data | MATH_REASONING | text | high (<60s) | medium | LOCAL_REASONING or Anthropic claude-opus-4 |
| 19 | Product Manager | Business | BUSINESS_ANALYSIS | text | medium (<10s) | low | Anthropic claude-sonnet-4 or Gemini |
| 20 | Product Owner | Business | BUSINESS_ANALYSIS | text | medium (<10s) | low | Anthropic claude-sonnet-4 |
| 21 | Business Analyst | Business | BUSINESS_ANALYSIS | text | medium (<10s) | medium | Anthropic claude-sonnet-4 or Gemini |
| 22 | Growth Marketer | Business | CREATIVE_WRITING | text | low (<2s) | low | OpenAI gpt-4o-mini |
| 23 | Performance Marketer | Business | DATA_ANALYSIS | text | low (<2s) | low | Gemini gemini-2.5-flash |
| 24 | SEO Specialist | Business | TECHNICAL_WRITING | text | medium (<10s) | low | OpenAI gpt-4o-mini or local |
| 25 | Social Media Manager | Business | CREATIVE_WRITING | text+image | low (<2s) | low | OpenAI gpt-4o-mini + IMAGE_GEMINI |
| 26 | Content Strategist | Business | CREATIVE_WRITING | text | medium (<10s) | low | OpenAI gpt-4o-mini |
| 27 | Copywriter | Business | CREATIVE_WRITING | text | low (<2s) | low | OpenAI gpt-4o-mini |
| 28 | Technical Writer | Business | TECHNICAL_WRITING | text | high (<60s) | low | LOCAL_FILE_GENERATION or Anthropic |
| 29 | Sales Engineer | Operations | BUSINESS_ANALYSIS | text | low (<2s) | medium | Anthropic claude-sonnet-4 |
| 30 | Support Engineer | Operations | GENERAL_CHAT | text | low (<2s) | low | local-ollama or OpenAI gpt-4o-mini |
| 31 | CS Manager | Operations | SUMMARIZATION | text | low (<2s) | medium | Gemini gemini-2.5-flash or local |
| 32 | Solutions Architect | Operations | INFRASTRUCTURE | text | high (<60s) | medium | Anthropic claude-opus-4 |
| 33 | Finance Analyst | Operations | DATA_ANALYSIS | text | medium (<10s) | critical | LOCAL only (financial data) |
| 34 | Operations Manager | Operations | BUSINESS_ANALYSIS | text | medium (<10s) | low | Gemini or Anthropic |
| 35 | Legal Counsel | Operations | PRIVACY_SENSITIVE | text | high (<60s) | critical | LOCAL only (legal privilege) |
| 36 | HR Manager | Operations | PRIVACY_SENSITIVE | text | medium (<10s) | critical | LOCAL only (PII) |
| 37 | Learning Designer | Operations | CREATIVE_WRITING | text | high (<60s) | low | OpenAI gpt-4o-mini or Anthropic |
| 38 | Project Manager | Operations | SUMMARIZATION | text | low (<2s) | low | local-ollama or Gemini |
| 39 | Scrum Master | Operations | SUMMARIZATION | text | low (<2s) | low | local-ollama or OpenAI |
| 40 | Medical Researcher | Domain | PRIVACY_SENSITIVE | text | high (<60s) | critical | LOCAL only (HIPAA/PHI) |
| 41 | Clinical Doc Specialist | Domain | PRIVACY_SENSITIVE | text | high (<60s) | critical | LOCAL only (HIPAA/PHI) |
| 42 | Law Researcher | Domain | PRIVACY_SENSITIVE | text | high (<60s) | critical | LOCAL only (privilege) |
| 43 | Procurement Specialist | Domain | BUSINESS_ANALYSIS | text | medium (<10s) | medium | Anthropic or Gemini |
| 44 | Real Estate Analyst | Domain | DATA_ANALYSIS | text | medium (<10s) | medium | Gemini gemini-2.5-flash |
| 45 | Video Creator | Domain | IMAGE_GENERATION | text+video | high (<60s) | low | IMAGE_GEMINI or IMAGE_OPENAI |
| 46 | Image Designer | Domain | IMAGE_GENERATION | text+image | medium (<10s) | low | IMAGE_GEMINI or IMAGE_OPENAI |
| 47 | Brand Designer | Domain | IMAGE_GENERATION | text+image | medium (<10s) | low | IMAGE_GEMINI or IMAGE_OPENAI |
| 48 | Voiceover Artist | Domain | GENERAL_CHAT | text+audio | medium (<10s) | low | ElevenLabs (future) or local |
| 49 | Market Researcher | Domain | DATA_ANALYSIS | text | high (<60s) | medium | Gemini gemini-2.5-flash or Anthropic |
| 50 | Executive Assistant | Domain | SUMMARIZATION | text | low (<2s) | medium | local-ollama or OpenAI gpt-4o-mini |

### Engineering Cluster (Roles 1-12)

**Shared characteristics**: All roles in this cluster primarily produce or review code. They require strong instruction following, multi-file reasoning, and language-specific syntax awareness.

**Detection keywords (extend `CODING_KEYWORDS`):**

```
function, class, method, API, endpoint, deploy, pipeline, test, bug, debug,
refactor, PR, merge, branch, CI, CD, Docker, Kubernetes, terraform, ansible,
nginx, SSL, firewall, vulnerability, CVE, exploit, penetration, XSS,
SQL injection, OWASP, CSRF, CORS, certificate, reverse proxy, load balancer,
microservice, container, pod, helm, ingress, service mesh, GitHub Actions,
Jenkins, CircleCI, Playwright, Cypress, Selenium, Jest, Vitest, pytest,
unittest, mock, stub, fixture, assertion, coverage, E2E, integration test,
unit test, smoke test, regression, acceptance criteria, test plan, QA
```

**Routing rules:**
- Default executor: Anthropic claude-sonnet-4 (best coding benchmarks)
- If `LOCAL_CODING` model installed and Ollama healthy: prefer local for standard code generation
- Security Engineer and Penetration Tester: always LOCAL (sensitivity = high/critical)
- Cloud Architect and Solutions Architect: Anthropic claude-opus-4 (needs deep reasoning)
- UAT Specialist: route to `LOCAL_FILE_GENERATION` for test plan documents

### Data Cluster (Roles 13-18)

**Shared characteristics**: These roles work with datasets, statistical methods, ML pipelines, and prompt engineering. They need large context windows, structured output, and mathematical reasoning.

**Detection keywords (new constant `DATA_KEYWORDS`):**

```
dataset, dataframe, pandas, numpy, SQL query, ETL, pipeline, model training,
hyperparameter, epoch, loss function, gradient, feature engineering, A/B test,
statistical significance, p-value, correlation, regression, clustering,
neural network, transformer, fine-tune, RLHF, prompt template, few-shot,
chain-of-thought, embedding, vector, dimension, tokenizer, batch size,
learning rate, overfitting, cross-validation, precision, recall, F1 score,
ROC, AUC, confusion matrix, scikit-learn, TensorFlow, PyTorch, Hugging Face,
wandb, mlflow, feature store, data lake, data warehouse, Spark, Airflow,
dbt, BigQuery, Redshift, Snowflake
```

**Routing rules:**
- Data analysis (CSV/JSON parsing, large datasets): Gemini gemini-2.5-flash (1M context)
- Mathematical reasoning (proofs, statistics): DeepSeek deepseek-chat or LOCAL_REASONING
- ML code (PyTorch, TensorFlow): Anthropic claude-sonnet-4 or LOCAL_CODING
- Prompt engineering: OpenAI gpt-4o-mini (creative iteration)
- Research Scientist: LOCAL_REASONING for chain-of-thought, Anthropic claude-opus-4 for architecture

### Business Cluster (Roles 19-28)

**Shared characteristics**: These roles produce business documents, marketing copy, analysis reports, and strategic content. They need fluent natural language, structured formatting, and occasional data interpretation.

**Detection keywords (new constant `BUSINESS_KEYWORDS`):**

```
user story, acceptance criteria, sprint, backlog, roadmap, KPI, OKR,
conversion rate, funnel, A/B test, campaign, CTR, CPC, ROAS, keyword research,
meta description, social post, content calendar, blog post, landing page,
headline, CTA, copy, tone of voice, documentation, README, changelog,
API docs, stakeholder, requirements, PRD, spec, wireframe, prototype,
competitor analysis, market research, SWOT, positioning, value proposition,
go-to-market, pricing strategy, churn, retention, LTV, CAC, MRR, ARR,
quarterly review, board deck, investor update, pitch deck, executive summary
```

**Routing rules:**
- Creative writing (blog, social, copy): OpenAI gpt-4o-mini
- Business analysis (PRD, specs, market research): Anthropic claude-sonnet-4 or Gemini
- Technical writing (docs, changelogs): LOCAL_FILE_GENERATION or Anthropic
- Social Media Manager: dual routing -- text to OpenAI, image requests to IMAGE_GEMINI
- SEO Specialist: OpenAI gpt-4o-mini for meta descriptions, local for bulk keyword analysis

### Operations Cluster (Roles 29-39)

**Shared characteristics**: These roles handle customer interactions, internal processes, financial data, legal documents, and project management. Sensitivity varies widely -- Finance, Legal, and HR are critical.

**Detection keywords (new constant `OPERATIONS_KEYWORDS`):**

```
proposal, demo, RFP, ticket, escalation, SLA, onboarding, churn, ARR, MRR,
revenue, budget, forecast, P&L, compliance, GDPR, HIPAA, SOC2, contract,
NDA, job description, interview, training module, Gantt, sprint planning,
retrospective, velocity, burndown, standup, kanban, capacity planning,
resource allocation, vendor management, procurement, invoice, purchase order,
audit trail, risk register, incident report, postmortem, RCA, SOP,
policy document, employee handbook, performance review, compensation,
benefits, payroll, termination, severance
```

**Routing rules:**
- Finance Analyst: ALWAYS LOCAL (financial data is critical sensitivity)
- Legal Counsel: ALWAYS LOCAL (attorney-client privilege)
- HR Manager: ALWAYS LOCAL (PII, compensation data)
- Support Engineer: low-latency local or OpenAI gpt-4o-mini
- Sales Engineer: Anthropic claude-sonnet-4 (needs technical accuracy in proposals)
- Project Manager / Scrum Master: local-ollama for quick summaries, Gemini for large context

### Domain Specialist Cluster (Roles 40-50)

**Shared characteristics**: These roles operate in regulated or specialized domains. Medical and legal roles have critical sensitivity. Creative roles need multimodal output.

**Detection keywords (new constant `DOMAIN_KEYWORDS`):**

```
clinical trial, patient, diagnosis, ICD-10, CPT code, SNOMED, HL7, FHIR,
adverse event, informed consent, IRB, FDA, case law, statute, precedent,
deposition, brief, motion, discovery, jurisdiction, liability, damages,
RFQ, vendor, property, mortgage, appraisal, zoning, title search,
video script, storyboard, timeline, keyframe, transition, b-roll,
logo, brand guidelines, color palette, typography, design system, Figma,
voice clone, narration, audio book, podcast, TTS, SSML, prosody,
market size, TAM, SAM, SOM, competitor analysis, industry report,
calendar, meeting notes, travel itinerary, expense report, action items
```

**Routing rules:**
- Medical Researcher / Clinical Doc: ALWAYS LOCAL (HIPAA, PHI)
- Law Researcher: ALWAYS LOCAL (privilege, case-sensitive data)
- Video Creator / Image Designer / Brand Designer: IMAGE_GEMINI for visual output, text tasks to OpenAI
- Voiceover Artist: future ElevenLabs connector, currently local text processing
- Market Researcher: Gemini (large context for report analysis) or Anthropic
- Executive Assistant: local for speed on quick tasks, Gemini for large document summarization

---

## Section 3: Capability Taxonomy

God Mode defines 15 capability classes. Each class has concrete routing rules, quality thresholds, and fallback chains.

### Capability Routing Matrix

| # | Capability | Primary Executor | Fallback 1 | Fallback 2 | Min Confidence | Max Latency |
|---|-----------|-----------------|------------|------------|----------------|-------------|
| 1 | CODE_GENERATION | LOCAL_CODING (if installed) | Anthropic claude-sonnet-4 | DeepSeek deepseek-chat | 0.80 | 10s |
| 2 | CODE_REVIEW | Anthropic claude-sonnet-4 | LOCAL_CODING | Gemini gemini-2.5-flash | 0.85 | 15s |
| 3 | DEBUGGING | LOCAL_CODING (if installed) | Anthropic claude-sonnet-4 | DeepSeek deepseek-chat | 0.80 | 10s |
| 4 | INFRASTRUCTURE | Anthropic claude-sonnet-4 | LOCAL_CODING | OpenAI gpt-4o-mini | 0.75 | 15s |
| 5 | DATA_ANALYSIS | Gemini gemini-2.5-flash | LOCAL_REASONING | Anthropic claude-sonnet-4 | 0.75 | 30s |
| 6 | MATH_REASONING | DeepSeek deepseek-chat | LOCAL_REASONING | Anthropic claude-opus-4 | 0.85 | 30s |
| 7 | CREATIVE_WRITING | OpenAI gpt-4o-mini | local-ollama (fallback chat) | Gemini gemini-2.5-flash | 0.70 | 5s |
| 8 | TECHNICAL_WRITING | LOCAL_FILE_GENERATION (if installed) | Anthropic claude-sonnet-4 | OpenAI gpt-4o-mini | 0.75 | 30s |
| 9 | BUSINESS_ANALYSIS | Anthropic claude-sonnet-4 | Gemini gemini-2.5-flash | OpenAI gpt-4o-mini | 0.75 | 15s |
| 10 | IMAGE_GENERATION | IMAGE_GEMINI | IMAGE_OPENAI | IMAGE_LOCAL | 0.90 | 30s |
| 11 | FILE_GENERATION | FILE_GENERATION / auto | LOCAL_FILE_GENERATION | Anthropic claude-sonnet-4 | 0.90 | 30s |
| 12 | TRANSLATION | local-ollama (multilingual) | Gemini gemini-2.5-flash | OpenAI gpt-4o-mini | 0.80 | 5s |
| 13 | SUMMARIZATION | local-ollama (fallback chat) | Gemini gemini-2.5-flash | OpenAI gpt-4o-mini | 0.70 | 10s |
| 14 | PRIVACY_SENSITIVE | LOCAL only (any role) | -- (no cloud fallback) | -- | 0.95 | 60s |
| 15 | GENERAL_CHAT | local-ollama (fallback chat) | OpenAI gpt-4o-mini | Gemini gemini-2.5-flash | 0.60 | 5s |

### Capability Detection Keywords

Each capability class has a keyword set used in Stage 2 of the routing pipeline. These extend the existing `CODING_KEYWORDS`, `REASONING_KEYWORDS`, and `THINKING_KEYWORDS`.

**CODE_GENERATION keywords (extend existing 28):**
```
write a function, implement, create a class, build a component, scaffold,
boilerplate, template, generate code, code snippet, starter code, module,
package, library, SDK, wrapper, middleware, hook, reducer, store, action,
selector, saga, thunk, migration, schema, model, entity, DTO, controller,
service, repository, resolver, handler, adapter, factory, builder, strategy
```

**CODE_REVIEW keywords:**
```
code review, review this code, review my code, PR review, pull request review,
check this code, audit this code, improve this code, optimize this code,
best practices, code quality, code smell, anti-pattern, design pattern,
SOLID, DRY, KISS, clean code, maintainability, readability, complexity,
cyclomatic, cognitive complexity, tech debt, refactoring opportunity
```

**DEBUGGING keywords:**
```
bug, error, exception, crash, stack trace, traceback, segfault, core dump,
undefined, null pointer, type error, reference error, syntax error,
runtime error, compilation error, linker error, memory leak, race condition,
deadlock, infinite loop, off-by-one, regression, flaky test, intermittent,
reproduce, root cause, bisect, breakpoint, watchpoint, profiler, flame graph
```

**INFRASTRUCTURE keywords:**
```
deploy, pipeline, CI, CD, Docker, Kubernetes, terraform, ansible, helm,
ingress, service mesh, load balancer, reverse proxy, SSL, certificate,
DNS, CDN, S3, EC2, Lambda, ECS, EKS, GKE, AKS, VPC, subnet, security group,
IAM, role, policy, CloudFormation, Pulumi, ArgoCD, FluxCD, Prometheus,
Grafana, Datadog, PagerDuty, alerting, monitoring, observability, SLO, SLI
```

**DATA_ANALYSIS keywords:**
```
analyze, dataset, dataframe, CSV, JSON, Excel, pivot, aggregate, group by,
filter, sort, join, merge, correlation, distribution, histogram, scatter,
bar chart, line chart, visualization, dashboard, Tableau, PowerBI, Looker,
SQL, query, window function, CTE, subquery, index, explain plan, partitioning
```

**MATH_REASONING keywords (extend existing 21):**
```
prove, solve, calculate, derive, theorem, equation, integral, derivative,
matrix, eigenvalue, linear algebra, differential equation, Fourier,
Laplace, probability, Bayesian, Markov, stochastic, combinatorics,
graph theory, number theory, topology, set theory, formal proof,
contradiction, induction, recursion, dynamic programming, greedy,
NP-hard, polynomial time, complexity class, big-O, amortized
```

**CREATIVE_WRITING keywords:**
```
write a story, creative, fiction, narrative, poem, poetry, screenplay,
dialogue, character, plot, setting, tone, voice, style, genre, metaphor,
simile, alliteration, blog post, article, essay, editorial, opinion piece,
newsletter, press release, social media caption, tagline, slogan, jingle,
ad copy, product description, brand voice, storytelling, hook, cliffhanger
```

**TECHNICAL_WRITING keywords:**
```
documentation, README, changelog, API docs, reference, guide, tutorial,
how-to, getting started, installation guide, troubleshooting, FAQ,
specification, RFC, ADR, design doc, architecture doc, runbook, SOP,
playbook, glossary, diagram, flowchart, sequence diagram, ER diagram,
user manual, release notes, migration guide, breaking changes
```

**BUSINESS_ANALYSIS keywords:**
```
user story, acceptance criteria, PRD, requirements, stakeholder, roadmap,
OKR, KPI, metric, dashboard, quarterly review, strategy, initiative,
epic, feature, capability, SWOT, competitive analysis, market research,
value proposition, business case, ROI, TCO, cost-benefit, pricing,
go-to-market, GTM, positioning, segmentation, persona, journey map
```

**TRANSLATION keywords:**
```
translate, translation, in Spanish, in French, in German, in Arabic,
in Portuguese, in Italian, in Russian, in Chinese, in Japanese, in Korean,
localize, localization, i18n, l10n, multilingual, bilingual, mother tongue,
native language, target language, source language, glossary, terminology
```

**SUMMARIZATION keywords:**
```
summarize, summary, TLDR, key points, main ideas, executive summary,
abstract, brief, digest, recap, overview, highlight, takeaway, bullet points,
condensed, shortened, abridged, meeting notes, action items, minutes
```

**PRIVACY_SENSITIVE keywords:**
```
patient, diagnosis, medical record, health record, PHI, HIPAA, prescription,
blood test, MRI, CT scan, lab results, treatment plan, prognosis,
social security, SSN, tax return, bank account, credit card, salary,
compensation, performance review, disciplinary, termination, severance,
attorney, privileged, confidential, classified, trade secret, NDA,
personal data, PII, GDPR, right to be forgotten, data subject, consent
```

---

## Section 4: External Connector Portfolio

God Mode expands the current 5 cloud connectors (OpenAI, Anthropic, Gemini, AWS Bedrock, DeepSeek) to 15 external connectors covering text, image, video, audio, and retrieval modalities.

### Connector Registry

| # | Connector | Provider Key | Best For | Cost Tier | Latency | Privacy | Primary Route | Fallback Use |
|---|-----------|-------------|----------|-----------|---------|---------|---------------|-------------|
| 1 | OpenAI | `OPENAI` | Creative writing, chat, general purpose | Medium ($2-10/M tokens) | Low (500ms-2s) | Cloud | CREATIVE_WRITING, GENERAL_CHAT | Universal text fallback |
| 2 | Anthropic | `ANTHROPIC` | Coding, debugging, code review, deep reasoning | High ($3-75/M tokens) | Medium (1-5s) | Cloud | CODE_GENERATION, CODE_REVIEW, BUSINESS_ANALYSIS | Primary cloud fallback |
| 3 | Google Gemini | `GEMINI` | Data analysis, multimodal, large context | Low ($0.15-5/M tokens) | Low (500ms-3s) | Cloud | DATA_ANALYSIS, SUMMARIZATION, IMAGE_GENERATION | Large context fallback |
| 4 | AWS Bedrock | `AWS_BEDROCK` | Enterprise compliance, multi-model gateway | Variable | Medium (1-5s) | Cloud (VPC) | BUSINESS_ANALYSIS (enterprise) | Regulated industry fallback |
| 5 | DeepSeek | `DEEPSEEK` | Math, algorithms, competitive programming, coding | Very Low ($0.14-2.19/M tokens) | Medium (1-4s) | Cloud | MATH_REASONING, CODE_GENERATION | Budget coding fallback |
| 6 | xAI (Grok) | `XAI` | Real-time information, current events, social analysis | Medium ($2-10/M tokens) | Low (500ms-2s) | Cloud | GENERAL_CHAT (current events) | Time-sensitive queries |
| 7 | Mistral (Codestral) | `MISTRAL` | Code completion, FIM (fill-in-middle), inline suggest | Low ($0.30-1/M tokens) | Very Low (<500ms) | Cloud (EU) | CODE_GENERATION (completion) | EU data residency |
| 8 | OpenAI Images (DALL-E) | `IMAGE_OPENAI` | Photorealistic images, text rendering in images | High ($0.04-0.12/image) | Medium (3-10s) | Cloud | IMAGE_GENERATION | Image quality fallback |
| 9 | Runway | `RUNWAY` | Video generation, motion, animation | Very High ($0.05-0.50/sec) | High (30-120s) | Cloud | VIDEO_GENERATION (future) | Not used as fallback |
| 10 | Google Veo | `VEO` | Video generation, cinematic quality | High ($0.02-0.10/sec) | High (30-60s) | Cloud | VIDEO_GENERATION (future) | Not used as fallback |
| 11 | ElevenLabs | `ELEVENLABS` | Voice synthesis, TTS, voice cloning | Medium ($0.15-0.30/1K chars) | Low (500ms-2s) | Cloud | AUDIO_GENERATION (future) | Not used as fallback |
| 12 | AssemblyAI | `ASSEMBLYAI` | Speech-to-text, transcription, audio analysis | Low ($0.01-0.05/min) | Medium (1-5s) | Cloud | AUDIO_TRANSCRIPTION (future) | Not used as fallback |
| 13 | Voyage AI | `VOYAGE` | Text embeddings, semantic search | Very Low ($0.02-0.12/M tokens) | Very Low (<200ms) | Cloud | EMBEDDING (memory service) | Not used for routing |
| 14 | Cohere Rerank | `COHERE_RERANK` | Search result reranking, relevance scoring | Very Low ($1/1K searches) | Very Low (<100ms) | Cloud | RERANKING (memory service) | Not used for routing |
| 15 | Jina Reranker | `JINA_RERANK` | Cross-encoder reranking, multilingual | Very Low ($0.02/1K queries) | Very Low (<100ms) | Cloud | RERANKING (memory service) | Cohere fallback |

### Connector Health Integration

The routing engine checks connector health via `context.connectorHealth` (a `Record<string, boolean>` populated by the connector service's health check events). New connectors must:

1. Be added to the `ConnectorProvider` Prisma enum in `claw-connector-service`
2. Have a health check adapter in `claw-connector-service`
3. Publish `connector.health_checked` events to RabbitMQ
4. Be registered in `VALID_PROVIDERS` set in `routing.constants.ts`

### Cost Tier Definitions

| Tier | Cost Range (per 1M input tokens) | Examples |
|------|----------------------------------|----------|
| Free | $0 | local-ollama, IMAGE_LOCAL |
| Very Low | $0.01-0.50 | DeepSeek, Voyage, Cohere, Jina |
| Low | $0.15-1.00 | Gemini Flash, Mistral |
| Medium | $2-10 | OpenAI gpt-4o-mini, xAI Grok |
| High | $3-75 | Anthropic claude-sonnet-4/opus-4, DALL-E |
| Very High | >$50 | Runway video generation |

---

## Section 5: Local Model Portfolio

God Mode organizes local models into 9 families optimized for the 16-32GB RAM target of ClawAI deployments.

### Local Model Family Matrix

| # | Family | Best Size for ClawAI | Primary Role | VRAM Required | Key Benchmark | Recommended Ollama Name |
|---|--------|---------------------|--------------|---------------|---------------|------------------------|
| 1 | Gemma (Google) | Gemma 3 4B (general), Gemma 3 9B (file-gen) | LOCAL_FALLBACK_CHAT, LOCAL_FILE_GENERATION | 3.3GB / 6.4GB | MMLU 63.2 (4B) | `gemma3:4b`, `gemma3:9b` |
| 2 | Qwen (Alibaba) | Qwen 2.5 Coder 7B (coding), Qwen 3 1.7B (routing) | LOCAL_CODING, ROUTER | 5.0GB / 1.3GB | HumanEval 76.0 (7B) | `qwen2.5-coder:7b`, `qwen3:1.7b` |
| 3 | Llama (Meta) | Llama 3.3 8B (file-gen), Llama 4 Maverick (thinking) | LOCAL_FILE_GENERATION, LOCAL_THINKING | 5.4GB / 18.3GB | MMLU 73.0 (8B) | `llama3.3:8b`, `llama4-maverick` |
| 4 | DeepSeek (distilled) | DeepSeek R1 7B (reasoning), DeepSeek Coder V2 16B (coding) | LOCAL_REASONING, LOCAL_CODING | 5.0GB / 10.7GB | MATH-500 85%+ (7B) | `deepseek-r1:7b`, `deepseek-coder-v2:16b` |
| 5 | Mistral | Mistral Small 3 7B (file-gen/routing) | LOCAL_FILE_GENERATION, ROUTER | 4.8GB | MMLU 70.5 | `mistral-small3:7b` |
| 6 | Coding Specialized | StarCoder2 7B (completion) | LOCAL_CODING (autocomplete) | 4.8GB | HumanEval 46.0 | `starcoder2:7b` |
| 7 | Fast Classifiers | SmolLM2 1.7B, Phi-4-mini 3.8B | ROUTER | 1.0GB / 2.5GB | Classification F1 >0.9 | `smollm2:1.7b`, `phi4-mini` |
| 8 | Multilingual | Gemma 3 9B (multilingual content) | LOCAL_FILE_GENERATION, TRANSLATION | 6.4GB | Multilingual MMLU 67.0 | `gemma3:9b` |
| 9 | Vision-capable | Gemma 3 4B (with vision), Llama 4 Maverick (multimodal) | LOCAL_FALLBACK_CHAT (vision tasks) | 3.3GB / 18.3GB | VQA 72.0 (4B) | `gemma3:4b` |

### RAM Budget Planning

For a 32GB RAM system (typical ClawAI deployment):

| Configuration | Models Loaded | Total VRAM | Remaining for OS/Services |
|--------------|--------------|------------|--------------------------|
| Minimal | gemma3:4b + qwen3:1.7b | 4.6GB | 27.4GB |
| Standard | gemma3:4b + qwen2.5-coder:7b + deepseek-r1:7b + qwen3:1.7b | 14.6GB | 17.4GB |
| Full | Standard + glm4 + gemma3:9b | 25.7GB | 6.3GB |
| Maximum | Full + deepseek-coder-v2:16b | 36.4GB | Requires 48GB+ |

### Model Selection Rules for Auto-Pull

The `AUTO_PULL_MODELS` environment variable controls which models are downloaded on Docker startup. God Mode recommends:

| RAM Available | Recommended AUTO_PULL_MODELS |
|--------------|------------------------------|
| 8GB | `gemma3:4b qwen3:1.7b` |
| 16GB | `gemma3:4b qwen2.5-coder:7b qwen3:1.7b deepseek-r1:7b` |
| 32GB | `gemma3:4b qwen2.5-coder:7b qwen3:1.7b deepseek-r1:7b glm4:latest gemma3:9b` |
| 48GB+ | All recommended models from catalog |

---

## Section 6: Routing Classifier Design

God Mode replaces the current flat keyword-matching approach with a multi-stage pipeline. Each stage has a strict latency budget and clear pass/fail criteria.

### Pipeline Overview

```
User Message + Context
  |
  Stage 1: Modality Detection (<10ms)
  |   -> text | image | file | audio | video | multimodal
  |
  Stage 2: Category Classification (<50ms)
  |   -> one of 15 capability classes
  |
  Stage 3: Sensitivity Check (<5ms)
  |   -> public | internal | confidential | critical
  |
  Stage 4: Provider Selection (<20ms)
  |   -> score candidates on cost/latency/quality
  |
  Stage 5: Fallback Chain Construction (<5ms)
  |   -> ordered list of backup provider/model pairs
  |
  Total budget: <90ms (without LLM-assisted routing)
  With LLM-assisted: <500ms (Stage 2 uses Ollama router)
```

### Stage 1: Modality Detection (<10ms)

Pure keyword and attachment analysis. No LLM call.

**Input:** `RoutingContext.message`, attached file metadata (MIME types)

**Logic:**

```
IF message matches IMAGE_KEYWORDS or art style indicators
  OR attachments include image/* MIME types with generation verbs
  -> modality = IMAGE

IF message matches FILE_GENERATION_KEYWORDS or verb+format combo
  -> modality = FILE

IF attachments include audio/* MIME types
  -> modality = AUDIO

IF attachments include video/* MIME types
  -> modality = VIDEO

IF message contains text only, no generation verbs
  -> modality = TEXT

IF multiple modalities detected
  -> modality = MULTIMODAL (route to most specific handler)
```

**Output:** `Modality` enum value. Image and file modalities short-circuit directly to their respective providers (IMAGE_GEMINI, FILE_GENERATION) without proceeding to Stage 2.

### Stage 2: Category Classification (<50ms)

Two-tier classification: fast keyword matching first, LLM-assisted routing as enhancement.

**Tier 1: Keyword matching (<5ms)**

Each capability class has a keyword set (defined in Section 3). The classifier scans the lowercased message against all 15 keyword sets in priority order:

```
Priority order (highest first):
  1. PRIVACY_SENSITIVE  (override — forces local)
  2. CODE_GENERATION / CODE_REVIEW / DEBUGGING
  3. MATH_REASONING
  4. DATA_ANALYSIS
  5. INFRASTRUCTURE
  6. TECHNICAL_WRITING
  7. BUSINESS_ANALYSIS
  8. CREATIVE_WRITING
  9. TRANSLATION
  10. SUMMARIZATION
  11. GENERAL_CHAT (default)
```

Scoring: count matching keywords per class. If the top class has 3+ keyword matches, accept it at confidence 0.85. If only 1-2 matches, proceed to Tier 2.

**Tier 2: LLM-assisted classification (<45ms remaining budget)**

Only invoked when Tier 1 confidence is below 0.85 AND the Ollama router is healthy. The LLM receives the dynamic prompt from `PromptBuilderManager` and returns a structured JSON decision.

**Output:** `CapabilityClass` enum + confidence score (0.0-1.0).

### Stage 3: Sensitivity Check (<5ms)

Scans message for privacy-sensitive keywords from the `PRIVACY_SENSITIVE` keyword list. Also checks:

- User's role preference (if set to a role in the Domain Specialist cluster with critical sensitivity)
- Thread-level privacy setting (if `thread.routingMode === PRIVACY_FIRST`)
- Active routing policies with privacy constraints

**Sensitivity levels:**

| Level | Description | Cloud Allowed | Local Required |
|-------|-------------|---------------|----------------|
| public | General content, no PII | Yes | No |
| internal | Business data, non-sensitive | Yes | Preferred |
| confidential | Customer data, financial | Restricted (Anthropic only) | Preferred |
| critical | Medical, legal, PII, credentials | No | Mandatory |

**Output:** `SensitivityLevel` enum. If `critical`, Stage 4 is restricted to local providers only.

### Stage 4: Provider Selection (<20ms)

Scores all healthy providers against the detected capability class. Uses a weighted scoring formula:

```
score = (quality_weight * quality_score)
      + (cost_weight * cost_score)
      + (latency_weight * latency_score)
      + (privacy_weight * privacy_score)
```

Default weights (configurable per routing policy):

| Factor | Weight | Scoring |
|--------|--------|---------|
| Quality | 0.40 | Benchmark score for this capability class (0.0-1.0) |
| Cost | 0.25 | Inverse of cost tier (free=1.0, very_low=0.8, low=0.6, medium=0.4, high=0.2, very_high=0.1) |
| Latency | 0.20 | Inverse of latency tier (fits within tolerance=1.0, exceeds by <2x=0.5, exceeds by >2x=0.1) |
| Privacy | 0.15 | local=1.0, cloud_with_dpa=0.7, cloud_without_dpa=0.3 |

**Quality scores per provider per capability (reference table):**

| Capability | local-ollama | OPENAI | ANTHROPIC | GEMINI | DEEPSEEK |
|-----------|-------------|--------|-----------|--------|----------|
| CODE_GENERATION | 0.70 | 0.75 | 0.95 | 0.70 | 0.85 |
| CODE_REVIEW | 0.50 | 0.70 | 0.95 | 0.65 | 0.70 |
| DEBUGGING | 0.60 | 0.70 | 0.90 | 0.65 | 0.80 |
| INFRASTRUCTURE | 0.50 | 0.70 | 0.90 | 0.70 | 0.60 |
| DATA_ANALYSIS | 0.50 | 0.70 | 0.80 | 0.90 | 0.65 |
| MATH_REASONING | 0.60 | 0.65 | 0.85 | 0.70 | 0.90 |
| CREATIVE_WRITING | 0.50 | 0.85 | 0.80 | 0.75 | 0.55 |
| TECHNICAL_WRITING | 0.60 | 0.75 | 0.85 | 0.75 | 0.60 |
| BUSINESS_ANALYSIS | 0.45 | 0.75 | 0.85 | 0.80 | 0.55 |
| TRANSLATION | 0.65 | 0.80 | 0.75 | 0.85 | 0.55 |
| SUMMARIZATION | 0.65 | 0.80 | 0.80 | 0.90 | 0.60 |
| GENERAL_CHAT | 0.70 | 0.80 | 0.75 | 0.75 | 0.60 |

**Output:** Ranked list of (provider, model, score) tuples. Top entry becomes the selected provider.

### Stage 5: Fallback Chain Construction (<5ms)

Builds an ordered fallback chain from the Stage 4 ranked list, excluding the primary selection:

**Rules:**
1. If primary is local, fallback chain includes healthy cloud providers in score order
2. If primary is cloud, fallback chain starts with local (if healthy), then other cloud providers
3. Maximum 3 entries in the fallback chain
4. If sensitivity is `critical`, only local providers appear in the fallback chain
5. IMAGE and FILE modalities have separate fallback chains (IMAGE_GEMINI -> IMAGE_OPENAI -> IMAGE_LOCAL)

**Output:** `FallbackEntry[]` (max 3 entries), which maps directly to the existing `RoutingDecisionResult.fallbackChain` field.

---

## Section 7: Policy Layers

Routing policies are stored in the `RoutingPolicy` table (`claw_routing` database) and evaluated by `RoutingManager.applyPolicies()` before the main routing pipeline runs. Policies can override the routing mode, force specific providers, or apply constraints.

### Privacy Policy

Forces local-only routing when the message or context contains sensitive data.

**Policy configuration:**

```json
{
  "name": "privacy-enforcement",
  "routingMode": "PRIVACY_FIRST",
  "priority": 100,
  "isActive": true,
  "config": {
    "type": "privacy",
    "forceLocal": true,
    "sensitivityKeywords": [
      "patient", "diagnosis", "medical record", "health record", "PHI",
      "HIPAA", "prescription", "blood test", "MRI", "lab results",
      "social security", "SSN", "tax return", "bank account", "credit card",
      "salary", "compensation", "performance review", "termination",
      "attorney", "privileged", "confidential", "classified", "trade secret",
      "personal data", "PII", "GDPR", "passport", "driver license"
    ],
    "blockedProviders": ["OPENAI", "GEMINI", "DEEPSEEK", "XAI", "MISTRAL"],
    "allowedProviders": ["local-ollama"]
  }
}
```

**Evaluation logic:**
1. Scan message for any keyword in `sensitivityKeywords`
2. If match found: override routing mode to `PRIVACY_FIRST`, restrict provider pool to `allowedProviders`
3. If no match: policy does not apply, proceed to next policy

**Implementation location:** `RoutingManager.applyPolicies()` in `routing.manager.ts`. The current implementation only checks the highest-priority policy's `routingMode`. God Mode extends this to also check `config.type === 'privacy'` and apply keyword-based filtering.

### Cost Policy

Enforces budget constraints by restricting provider selection to cost tiers at or below the configured maximum.

**Budget tier definitions:**

| Tier | Monthly Budget | Max Cost Per Request | Allowed Providers |
|------|---------------|---------------------|-------------------|
| free | $0 | $0 | local-ollama, IMAGE_LOCAL |
| low | $0-50 | $0.01 | free + DeepSeek, Gemini Flash |
| medium | $50-500 | $0.05 | low + OpenAI gpt-4o-mini, Anthropic claude-sonnet-4, IMAGE_GEMINI |
| high | $500+ | $0.50 | all providers including claude-opus-4, IMAGE_OPENAI, DALL-E |

**Policy configuration:**

```json
{
  "name": "cost-budget-control",
  "routingMode": "COST_SAVER",
  "priority": 90,
  "isActive": true,
  "config": {
    "type": "cost",
    "maxTier": "medium",
    "monthlyBudgetUsd": 200,
    "perRequestMaxUsd": 0.05,
    "preferLocal": true,
    "costWeightOverride": 0.50
  }
}
```

**Evaluation logic:**
1. Check current month's usage from `audit-service` usage ledger
2. If monthly budget exceeded: force `COST_SAVER` mode (local first, then cheapest cloud)
3. If within budget: adjust Stage 4 scoring weights to increase `cost_weight` to `costWeightOverride`
4. Filter out providers above `maxTier` from candidate pool

### Latency Policy

Enforces response time SLAs by restricting provider selection based on latency requirements.

**SLA tier definitions:**

| Tier | Max Acceptable Latency | Use Case | Preferred Providers |
|------|----------------------|----------|---------------------|
| realtime | <500ms | Autocomplete, inline suggestions | local fast models (SmolLM2, tinyllama), Mistral Codestral |
| fast | <2s | Chat responses, support tickets | OpenAI gpt-4o-mini, local gemma3:4b |
| standard | <10s | Code generation, analysis | Anthropic claude-sonnet-4, DeepSeek, Gemini |
| relaxed | <60s | Document generation, deep reasoning, image generation | Anthropic claude-opus-4, IMAGE providers, FILE_GENERATION |

**Policy configuration:**

```json
{
  "name": "latency-sla-enforcement",
  "routingMode": "LOW_LATENCY",
  "priority": 80,
  "isActive": true,
  "config": {
    "type": "latency",
    "maxLatencyMs": 2000,
    "slaTier": "fast",
    "latencyWeightOverride": 0.45,
    "excludeSlowProviders": ["ANTHROPIC"],
    "preferredProviders": ["OPENAI", "local-ollama"]
  }
}
```

**Evaluation logic:**
1. Determine the latency tolerance from the detected capability class (from Section 3 table)
2. If an active latency policy exists with a stricter `maxLatencyMs`, use the policy's value
3. Filter out providers with median latency exceeding the threshold
4. Adjust Stage 4 scoring weights to increase `latency_weight` to `latencyWeightOverride`

### Quality Policy

Enforces minimum confidence thresholds per capability class. Rejects routing decisions below the threshold and escalates to a higher-quality (and more expensive) provider.

**Policy configuration:**

```json
{
  "name": "quality-minimum-enforcement",
  "routingMode": "AUTO",
  "priority": 70,
  "isActive": true,
  "config": {
    "type": "quality",
    "minConfidenceByCapability": {
      "CODE_GENERATION": 0.80,
      "CODE_REVIEW": 0.85,
      "DEBUGGING": 0.80,
      "MATH_REASONING": 0.85,
      "DATA_ANALYSIS": 0.75,
      "CREATIVE_WRITING": 0.70,
      "TECHNICAL_WRITING": 0.75,
      "BUSINESS_ANALYSIS": 0.75,
      "IMAGE_GENERATION": 0.90,
      "FILE_GENERATION": 0.90,
      "TRANSLATION": 0.80,
      "SUMMARIZATION": 0.70,
      "PRIVACY_SENSITIVE": 0.95,
      "GENERAL_CHAT": 0.60,
      "INFRASTRUCTURE": 0.75
    },
    "escalationProvider": "ANTHROPIC",
    "escalationModel": "claude-opus-4",
    "qualityWeightOverride": 0.55
  }
}
```

**Evaluation logic:**
1. After Stage 4 produces a selection, check its quality score against the minimum for the detected capability
2. If below minimum: escalate to `escalationProvider` / `escalationModel` (if healthy and within cost policy)
3. If escalation provider is also below minimum or unhealthy: accept the best available with a warning tag in `reasonTags`

### Policy Interaction Rules

Policies are evaluated by priority (highest number wins). When multiple policies apply:

1. **Privacy always wins.** If privacy policy triggers, it overrides cost and latency policies. A critical-sensitivity message always routes locally regardless of cost savings or latency preferences.

2. **Cost constrains provider pool.** After privacy check, cost policy removes providers above the budget tier. Quality and latency policies then operate within the remaining pool.

3. **Latency filters within budget.** After cost filtering, latency policy removes providers that cannot meet the SLA. Quality policy operates on the final filtered pool.

4. **Quality escalates within constraints.** Quality policy can only escalate to providers that pass both cost and latency filters. If no provider meets the quality minimum within constraints, the best available is used with a `quality_below_threshold` reason tag.

**Policy evaluation order (implemented in `applyPolicies`):**

```
1. Sort policies by priority descending
2. FOR each policy:
     IF policy.config.type === 'privacy' AND message matches keywords:
       -> restrict to local, set mode to PRIVACY_FIRST, stop
     IF policy.config.type === 'cost':
       -> filter provider pool by cost tier
     IF policy.config.type === 'latency':
       -> filter provider pool by latency tier
     IF policy.config.type === 'quality':
       -> set minimum confidence thresholds
3. Run Stage 1-5 pipeline with filtered provider pool and adjusted weights
```

### Composite Policy Example: Enterprise Deployment

A regulated enterprise might combine all four policy types:

```json
[
  {
    "name": "hipaa-compliance",
    "routingMode": "PRIVACY_FIRST",
    "priority": 100,
    "config": {
      "type": "privacy",
      "sensitivityKeywords": ["patient", "diagnosis", "PHI", "HIPAA"],
      "forceLocal": true
    }
  },
  {
    "name": "monthly-budget-cap",
    "routingMode": "COST_SAVER",
    "priority": 90,
    "config": {
      "type": "cost",
      "maxTier": "medium",
      "monthlyBudgetUsd": 500
    }
  },
  {
    "name": "user-experience-sla",
    "routingMode": "LOW_LATENCY",
    "priority": 80,
    "config": {
      "type": "latency",
      "maxLatencyMs": 5000,
      "slaTier": "standard"
    }
  },
  {
    "name": "code-quality-minimum",
    "routingMode": "AUTO",
    "priority": 70,
    "config": {
      "type": "quality",
      "minConfidenceByCapability": {
        "CODE_GENERATION": 0.85,
        "CODE_REVIEW": 0.90
      },
      "escalationProvider": "ANTHROPIC",
      "escalationModel": "claude-sonnet-4"
    }
  }
]
```

**Result for a medical coding request ("Write a FHIR patient resource parser in TypeScript"):**
1. Privacy policy: keyword "patient" matches -> forces LOCAL
2. Cost policy: local is free -> passes
3. Latency policy: local latency <5s -> passes
4. Quality policy: LOCAL_CODING quality for CODE_GENERATION is 0.70, below 0.85 minimum -> would escalate to Anthropic, but privacy policy blocks cloud -> accepts local with `quality_below_threshold` tag
5. Final decision: `local-ollama / qwen2.5-coder:7b`, confidence 0.70, reasonTags: `['privacy_enforced', 'quality_below_threshold', 'local_coding']`

---

## Appendix A: Implementation Roadmap

### Phase 1: Extended Keyword Detection (No breaking changes)

Files to modify:
- `apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts` -- add DATA_KEYWORDS, BUSINESS_KEYWORDS, OPERATIONS_KEYWORDS, DOMAIN_KEYWORDS, expanded CODE_REVIEW/DEBUGGING/INFRASTRUCTURE/CREATIVE_WRITING/TECHNICAL_WRITING/TRANSLATION/SUMMARIZATION keyword arrays
- `apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts` -- add `detectDataRequest()`, `detectBusinessRequest()`, `detectInfrastructureRequest()`, `detectCreativeRequest()`, `detectTranslationRequest()`, `detectSummarizationRequest()`, `detectPrivacySensitiveRequest()` methods
- `packages/shared-types/src/enums/local-model-role.enum.ts` -- add `LOCAL_TRANSLATION`, `LOCAL_DATA_ANALYSIS` roles (if local models support these)

### Phase 2: Sensitivity Classification

Files to modify:
- `apps/claw-routing-service/src/modules/routing/types/routing.types.ts` -- add `SensitivityLevel` type, update `RoutingDecisionResult` with `sensitivityLevel` field
- `apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts` -- add `classifySensitivity()` method, integrate into `handleAuto()` pipeline
- `apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts` -- add `PRIVACY_SENSITIVE_KEYWORDS` constant

### Phase 3: Multi-Factor Provider Scoring

Files to modify:
- `apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts` -- add `QUALITY_SCORES`, `COST_SCORES`, `LATENCY_SCORES` matrices
- `apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts` -- replace `handleAutoHeuristic()` with `scoreProviders()` method using weighted formula
- `apps/claw-routing-service/src/modules/routing/types/routing.types.ts` -- add `ProviderScore` type

### Phase 4: Policy Engine Enhancement

Files to modify:
- `apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts` -- extend `applyPolicies()` to parse `config.type` and apply keyword filtering, cost filtering, latency filtering, quality escalation
- `apps/claw-routing-service/prisma/schema.prisma` -- no schema change needed (policy config is JSON)
- Add seed data for default privacy and cost policies

### Phase 5: New Connector Types

Files to modify:
- `apps/claw-connector-service/prisma/schema.prisma` -- add `XAI`, `MISTRAL`, `RUNWAY`, `VEO`, `ELEVENLABS`, `ASSEMBLYAI`, `VOYAGE`, `COHERE_RERANK`, `JINA_RERANK` to `ConnectorProvider` enum
- `apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts` -- add new provider constants and update `VALID_PROVIDERS` set
- `apps/claw-connector-service/src/modules/connectors/` -- add adapter implementations for each new connector

---

## Appendix B: Keyword Count Summary

| Constant Name | Current Count | God Mode Count | Delta |
|--------------|--------------|----------------|-------|
| IMAGE_KEYWORDS + verb/noun combos | ~100 | ~100 (unchanged) | 0 |
| FILE_GENERATION (verbs x formats + exact) | ~169 | ~169 (unchanged) | 0 |
| CODING_KEYWORDS | 28 | 85 | +57 |
| REASONING_KEYWORDS | 21 | 55 | +34 |
| THINKING_KEYWORDS | 15 | 15 (unchanged) | 0 |
| CODE_REVIEW_KEYWORDS | 0 (new) | 25 | +25 |
| DEBUGGING_KEYWORDS | 0 (new) | 30 | +30 |
| INFRASTRUCTURE_KEYWORDS | 0 (new) | 40 | +40 |
| DATA_ANALYSIS_KEYWORDS | 0 (new) | 30 | +30 |
| CREATIVE_WRITING_KEYWORDS | 0 (new) | 35 | +35 |
| TECHNICAL_WRITING_KEYWORDS | 0 (new) | 28 | +28 |
| BUSINESS_ANALYSIS_KEYWORDS | 0 (new) | 30 | +30 |
| TRANSLATION_KEYWORDS | 0 (new) | 22 | +22 |
| SUMMARIZATION_KEYWORDS | 0 (new) | 20 | +20 |
| PRIVACY_SENSITIVE_KEYWORDS | 0 (new) | 30 | +30 |
| DATA_KEYWORDS (cluster) | 0 (new) | 50 | +50 |
| BUSINESS_KEYWORDS (cluster) | 0 (new) | 55 | +55 |
| OPERATIONS_KEYWORDS (cluster) | 0 (new) | 48 | +48 |
| DOMAIN_KEYWORDS (cluster) | 0 (new) | 45 | +45 |
| **Total** | **~333** | **~907** | **+574** |

---

## Appendix C: Decision Traceability

Every routing decision produces a `RoutingDecisionResult` stored in the `RoutingDecision` table. God Mode adds the following fields to the reason tags for full traceability:

| Tag | Meaning |
|-----|---------|
| `modality_text` | Stage 1: text modality detected |
| `modality_image` | Stage 1: image modality detected |
| `modality_file` | Stage 1: file generation modality detected |
| `capability_code_generation` | Stage 2: code generation capability classified |
| `capability_math_reasoning` | Stage 2: math reasoning capability classified |
| `capability_<name>` | Stage 2: other capability classified |
| `sensitivity_public` | Stage 3: no sensitive content detected |
| `sensitivity_critical` | Stage 3: critical sensitivity, forced local |
| `privacy_enforced` | Stage 3: privacy policy applied |
| `cost_constrained` | Policy: cost policy limited provider pool |
| `latency_constrained` | Policy: latency policy limited provider pool |
| `quality_below_threshold` | Policy: quality minimum not met, best-effort used |
| `quality_escalated` | Policy: escalated to higher-quality provider |
| `keyword_match_count_N` | Stage 2: N keywords matched for the detected capability |
| `ollama_router` | Stage 2: LLM-assisted classification used |
| `heuristic_fallback` | Stage 2: keyword-only classification (LLM unavailable) |
| `category_specific` | Local model matched by category role |
| `role_<role_name>` | User's selected professional role influenced routing |
