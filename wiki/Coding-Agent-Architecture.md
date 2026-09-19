> **Wiki source:** [`ihabkhaled/ClawAI-Coding-Agent/docs/ARCHITECTURE.md`](https://github.com/ihabkhaled/ClawAI-Coding-Agent/blob/main/docs/ARCHITECTURE.md) on the current `main` branch.

# Architecture

## Shape

```text
VS Code commands / webview / tree views / status bar
                        |
                 AgentCoordinator
          +-------------+--------------+
          |             |              |
     ChatService   ContextService   SafeEditService
          |             |              |
     BackendClient  VS Code FS     WorkspaceEdit adapter
          |
   ClawAI /api/v1 backend
```

`src/extension.ts` is the composition root. It registers all contributed
commands and views and owns disposable lifetimes.

## Runtime Protocol V2 foundation

The 0.18 runtime is an inert compatibility layer. Pure contracts under
`src/core/runtime` define a strict capability manifest, ordered event envelope,
protocol selection, and the only V2 event reducer. Host facts are mapped by a
pure infrastructure adapter from VS Code UI/extension host location, remote
name, platform, architecture, Trust, and workspace URI schemes. Discovery does
not execute commands.

The authenticated agent-service descriptor is negotiated only after profile
validation. V2 is selected when version 2.0, SSE, capability manifests, and
ordered events overlap. Every expected additive-endpoint failure selects the
legacy V1 adapter; account/session errors and cancellation remain hard
boundaries. Tool execution stays disabled until 0.19.

## Layers

- `src/core`: pure URL, session schema, state, model catalog, context,
  redaction, SSE, and edit-plan logic.
- `src/backend`: runtime contracts and the single authenticated HTTP client.
- `src/services`: chat, workflow, model, project/global context, configuration,
  initialization, and edit orchestration.
- `src/infrastructure`: VS Code output and atomic workspace-edit adapters.
- `src/views` and `src/webview`: editor presentation only.

Services use structural ports where meaningful, allowing security-critical
logic to run under Node without a VS Code host.

## Data flow

Login creates a `VSCODE` session, stages its token pair, validates the profile
with the staged access token, and then stores tokens in origin-scoped
`SecretStorage`. A candidate backend is not activated until authorization and
profile validation succeed. Authenticated requests attach the access token. A
single shared refresh promise prevents concurrent refresh storms; credential
and account epochs reject late writes after logout or endpoint replacement.

Chat creates or reuses a thread, opens the SSE stream before sending the
message, attributes provider/model events, assembles bounded output, and falls
back to persisted assistant messages if the stream ends without content.

Workspace collection filters paths before reading files, enforces byte/file
budgets, and records a receipt. Project workflows prepend profile-wide rules
and then `.clawai` rules, architecture, and memory.

Edit workflows parse one strict JSON edit plan. A VS Code adapter reads
before-state, opens diffs, captures an in-session backup, and applies a single
`WorkspaceEdit`.

## Ownership boundaries

The backend owns users, sessions, threads, messages, model availability,
entitlements, quotas, routing, provider credentials, and inference. The
extension never imports parent-monorepo code and never connects to service
databases or RabbitMQ.
