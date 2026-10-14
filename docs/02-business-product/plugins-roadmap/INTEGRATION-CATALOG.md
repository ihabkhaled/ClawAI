# INTEGRATION-CATALOG: plan for a broad set of services and MCP servers

Nothing here is verified against the vendor today. Every endpoint is a hint from memory: ALWAYS confirm before seeding ("verify"). Where I do not know an official remote server, the entry says `verify` or `none known` and the route is "via gateway" (Composio / Pipedream / Smithery hosted, or the vendor REST API wrapped by a first-party adapter).

Columns: Auth = O (OAuth 2.1 / PKCE, possibly dynamic client registration), K (API key / PAT / bearer header), N (none). Transport = H (streamable HTTP), S (legacy SSE), X (stdio, local only, needs sandbox, see GAPS P1-1), G (REST wrapped in a first-party adapter). Tier = risk tier: T0 public read-only, T1 private read, T2 writes (create/update/send), T3 destructive / money / infra / identity. Per ADR-179 every user-added tool starts as WRITE; the tier is the curated default we would ship.

Remote hints use the form `host/path (verify)`. "official" = vendor ships it (verify). "ref" = modelcontextprotocol reference/servers repo (verify, several are archived/moved).

## 1. Dev / source control (14)

| Service                     | Server / endpoint                                                     | Auth             | Tr    | Tier  |
| --------------------------- | --------------------------------------------------------------------- | ---------------- | ----- | ----- |
| GitHub                      | api.githubcopilot.com/mcp (official, verify); local github-mcp-server | O or K(PAT)      | H / X | T2-T3 |
| GitLab                      | official GitLab MCP on instance `/api/v4/mcp` (verify)                | O                | H     | T2    |
| Bitbucket                   | none known official (verify); REST via G                              | K (app password) | G     | T2    |
| Azure DevOps                | official ADO MCP (verify)                                             | O/K              | X/H   | T2    |
| Gitea / Forgejo             | gitea-mcp (verify)                                                    | K                | X     | T2    |
| Sourcegraph                 | official MCP (verify)                                                 | K                | H     | T1    |
| Git (local repo)            | ref `mcp-server-git`                                                  | N                | X     | T2    |
| Filesystem (local)          | ref filesystem                                                        | N                | X     | T3    |
| Sentry                      | mcp.sentry.dev (verify)                                               | O                | H     | T1-T2 |
| CircleCI                    | official (verify)                                                     | K                | X     | T2    |
| Jenkins                     | community (verify)                                                    | K                | X     | T2    |
| Codecov                     | verify                                                                | K                | G     | T1    |
| npm registry / package info | verify                                                                | N                | G     | T0    |
| Docker Hub                  | official (verify)                                                     | K                | X     | T1    |

## 2. Project management / issue tracking (14)

Jira (Atlassian remote, mcp.atlassian.com (verify), O, H/S, T2); Confluence (same Atlassian server, T2); Linear (mcp.linear.app (verify), O, H, T2); Asana (mcp.asana.com (verify), O, S/H, T2); ClickUp (official/community verify, K/O, H/X, T2); Monday.com (official verify, O/K, H, T2); Trello (verify, K, X, T2); Notion tasks (see docs); Basecamp (verify, O, G, T2); Shortcut (verify, K, X, T2); YouTrack (verify, K, X, T2); Height (verify), Wrike (verify, O, G, T2), Smartsheet (verify, O, G, T2), Airtable (verify, K/O, X/H, T2).

## 3. Docs / knowledge (14)

Notion (mcp.notion.com (verify), O, H, T2); Confluence (above); Google Docs, Sheets, Slides (via Google Workspace MCP, verify, O, T2); Dropbox Paper (verify); Coda (verify, K, G, T2); Obsidian (community, local vault, X, T2); Evernote (none known); Slite (verify); Guru (verify); Readme/GitBook (verify, K, G, T1); Docusaurus/site search via fetch (T0); Wikipedia (community, N, X/G, T0); Context7 (mcp.context7.com/mcp (verify), N/K, H, T0); DeepWiki (mcp.deepwiki.com (verify), N, H/S, T0).

## 4. Communication / chat (12)

Slack (official remote mcp.slack.com (verify), O, H, T2-T3 send as user); Microsoft Teams (verify; Graph via G, O, T2); Discord (community bots, K, X, T2); Telegram (community, K, X, T2); WhatsApp Business (verify, K, G, T2); Zoom (official verify, O, H, T1); Google Meet (via Workspace, verify); Twilio (official verify, K, X, T3 spend); SendGrid (verify, K, G, T2); Mailgun (verify, K, G, T2); Intercom (official verify, O, H, T2); Mattermost (community, K, X, T2).

## 5. Email / calendar (9)

Gmail (Google Workspace MCP, verify; O, T2-T3 send); Outlook mail (Microsoft Graph, O, G, T2-T3); Google Calendar (O, T2); Outlook Calendar (Graph, O, T2); Calendly (verify, O, G, T1); Cal.com (verify, K, X/G, T2); Fastmail (verify, K, G, T2); Proton (none known); IMAP/SMTP generic (community, K, X, T3).

## 6. Storage / files (9)

Google Drive (Workspace MCP, verify, O, T1-T2); OneDrive and SharePoint (Graph, O, G, T1-T2); Dropbox (verify, O, G, T2); Box (official verify, O, H, T2); S3 / R2 (AWS S3 MCP verify, K, X, T3); Backblaze (verify); Cloudinary (official verify, K, H, T2); Egnyte (verify); iCloud (none).

## 7. CRM / sales (12)

Salesforce (official verify, O, H, T2); HubSpot (official remote verify, O, H, T2); Pipedrive (verify, K/O, G, T2); Zoho CRM (verify, O, G, T2); Close (verify, K, G, T2); Attio (verify, O/K, H, T2); Apollo.io (verify, K, G, T1); Outreach / Salesloft (verify, O, G, T2); Clay (verify), ZoomInfo (verify, K, G, T1), Gong (verify, O, G, T1), Dynamics 365 (verify, O, G, T2).

## 8. Support / ITSM (9)

Zendesk (verify, O/K, H/X, T2); Freshdesk (verify, K, G, T2); Help Scout (verify, O, G, T2); Intercom (above); ServiceNow (verify, O/K, G, T2); PagerDuty (official verify, K, X, T2-T3); Opsgenie (verify, K, G, T2); Statuspage (verify, K, G, T2); Front (verify, O, G, T2).

## 9. Finance / payments / accounting (12)

Stripe (mcp.stripe.com (verify), O/K, H, T3 money); PayPal (official verify, O, H, T3); Square (official verify, O, H, T3); Paymob (none known, G, T3 - our own prod provider, do not expose to users); Plaid (verify, K, G, T1); QuickBooks (verify, O, G, T2); Xero (official verify, O, X/H, T2); FreshBooks (verify, O, G, T2); Wise (verify, K, G, T3); Brex / Ramp (verify, O/K, G, T2); Coinbase / crypto (verify, K, X, T3), Bank feeds via Plaid (T1).

## 10. Data / BI / databases (18)

PostgreSQL (ref/verify, conn string K, X, T1-T3), SQLite (ref, N, X, T2), MySQL (community, K, X), MongoDB (official verify, K, X, T2), Redis (official verify, K, X, T3), Supabase (mcp.supabase.com (verify), O/K, H, T3), Neon (mcp.neon.tech (verify), O, H/S, T3), PlanetScale (verify), Turso (verify), Snowflake (official verify, K/O, X/H, T1-T2), BigQuery (Google, verify, O, H/X, T1), Databricks (official verify, K, H, T1-T2), ClickHouse (official verify, K, X, T1), Elasticsearch (official verify, K, X, T1), Pinecone (official verify, K, X, T2), Qdrant (official verify, K, X, T2), Metabase (verify, K, X, T1), Tableau (official verify, O/K, X, T1), Looker (verify), Power BI (verify, O, G, T1), Google Analytics (verify, O, X, T1), Mixpanel / Amplitude / PostHog (verify, K, H/X, T1).

## 11. Cloud / DevOps (16)

Vercel (mcp.vercel.com (verify), O, H, T3); Cloudflare (mcp.cloudflare.com family (verify), O, H, T3); AWS (awslabs MCP servers verify, K/IAM, X, T3); Azure (official verify, O, X, T3); Google Cloud (verify, O, X/H, T3); Kubernetes (community verify, kubeconfig, X, T3); Docker (verify, N, X, T3); Terraform / HCP (official verify, K, X, T3); Pulumi (official verify, O/K, H, T3); Netlify (official verify, O, H, T3); Render (official verify, K, H, T3); Railway (verify, K, X, T3); Fly.io (verify), Heroku (official verify, K, X, T3); DigitalOcean (official verify, K, H/X, T3); GitHub Actions (via GitHub, T2); Ansible (community, X, T3).

## 12. Observability (10)

Sentry (above); Datadog (official remote verify, O/K, H, T1); Grafana (official verify, K, X, T1); Prometheus (community verify, N/K, X, T1); New Relic (official verify, K, H, T1); Honeycomb (verify, K, H, T1); Dynatrace (official verify, K/O, X, T1); Splunk (verify, K, X, T1); Logz.io / Loki (verify); Axiom (verify, K, X/H, T1); PagerDuty (above); LaunchDarkly (official verify, K, X, T2).

## 13. Security (8)

Snyk (official verify, K, X, T1); Semgrep (official verify, K, X/H, T1); 1Password (verify; secrets, avoid, T3); Okta (official verify, K, X, T3); Auth0 (official verify, O, X, T3); VirusTotal (verify, K, G, T0); Have I Been Pwned (verify, K, G, T0); Trivy / Wiz (verify, K, X, T1).

## 14. Design / creative (8)

Figma (official remote mcp.figma.com (verify), O, H, T1); Canva (official verify, O, H, T2); Adobe (verify), Sketch (verify), Miro (official verify, O, H, T2), Excalidraw (community verify, N, X/H, T0), Framer (verify), Webflow (official verify, O, H, T2), Storybook (verify, N, X, T0).

## 15. Marketing / analytics / social (12)

Google Ads (verify, O, G, T2-T3 spend), Meta Ads (verify, O, G, T3), LinkedIn (verify, O, G, T2), X/Twitter (verify, K/O, G, T2), YouTube (verify, O/K, G, T1-T2), Mailchimp (verify, K, G, T2), Klaviyo (official verify, K, X/H, T2), Buffer / Hootsuite (verify, O, G, T2), Semrush / Ahrefs (verify, K, H/G, T1), Search Console (verify, O, G, T1), Segment (verify, K, G, T2), Brevo (verify, K, G, T2).

## 16. E-commerce (8)

Shopify (storefront/Dev MCP verify, O/K, H/X, T2), WooCommerce (verify, K, G, T2), BigCommerce (verify, K, G, T2), Etsy (verify, O, G, T2), Amazon SP-API (verify, O, G, T2), eBay (verify, O, G, T2), Square (above), Lemon Squeezy / Paddle (verify, K, G, T3).

## 17. HR / people / productivity (8)

BambooHR (verify, K, G, T1), Workday (verify, O, G, T1), Gusto (verify, O, G, T2), Rippling (verify, O, G, T2), Greenhouse / Lever (verify, K, G, T1), Deel (verify, K, G, T2), Todoist (verify, O/K, H/X, T2), Google Tasks (Workspace, T2), Toggl / Harvest (verify, K, G, T1), Zapier MCP (verify, K, H, T2-T3 aggregator), Make / n8n (verify, K, H, T3 aggregator).

## 18. AI / media tools (10)

Hugging Face (official remote verify, O/K, H, T1), Replicate (official verify, K, H/X, T2 spend), ElevenLabs (official verify, K, X, T2 spend), OpenAI / Anthropic / Gemini APIs (not needed, we are the router), Stability (verify), Runway (verify), Perplexity (official verify, K, X, T1), Exa (official verify, K, H, T0-T1), Tavily (official verify, K, H, T0), Firecrawl (official verify, K, H/X, T0), Brave Search (official verify, K, X, T0), Mem0 / memory servers (verify, K, H, T2), Langfuse (verify).

## 19. Browsers / search / web (10)

Fetch (ref, N, X; we already have first-party `web-fetch`, T0), Playwright (Microsoft, N, X, T2-T3; needs remote browser sandbox), Puppeteer (ref archived verify), Chrome DevTools MCP (Google, N, X, T2), Browserbase (official verify, K, H/X, T2), Apify (official verify, K, H, T1-T2), Bright Data (verify, K, H, T1), Google Search / SerpAPI (verify, K, G, T0), DuckDuckGo (community, N, X, T0), Wayback (verify, N, G, T0).

## 20. Local / utility tools (12)

Time (ref `mcp-server-time`, N, X, T0; we have first-party datetime-and-math), Memory (ref knowledge-graph, N, X, T2), Sequential Thinking (ref, N, X, T0), Everything (ref test server, N, X, T0, QA only), Calculator (first-party), Weather (first-party Open-Meteo style, T0), Maps / Google Maps (official/ref verify, K, X, T0), Currency / FX (verify, N, G, T0), Unit conversion (T0), Home Assistant (official verify, K, H, T3), Spotify (verify, O, G, T2), Obsidian / Apple Notes / Reminders (macOS, X, local only, T2).

## Counts and rollout waves

Roughly 190 distinct services counting aggregators. Waves: W1 (10, keyless or API-key, remote HTTP, T0-T1): Context7, DeepWiki, Exa, Tavily, Firecrawl, Hugging Face, Brave, Time/Weather (existing), Fetch (existing), Wikipedia-style. W2 (15, OAuth remote, needs P0-3): GitHub, Atlassian (Jira+Confluence), Linear, Notion, Sentry, Slack, Asana, Vercel, Stripe(test mode), Cloudflare, Figma, Canva, HubSpot, Supabase, Neon. W3 (OAuth Graph/Google adapters via workspace-service bridge, P1-7): Gmail, Drive, Calendar, Outlook, OneDrive, Teams, SharePoint. W4+ long tail through a gateway or user-added URL. stdio-only servers (filesystem, git, sqlite, memory, sequential-thinking, playwright, postgres) only after P1-1 or in the VS Code coding agent.
