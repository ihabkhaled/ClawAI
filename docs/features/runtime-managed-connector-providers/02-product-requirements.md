# Product requirements

1. Admins can page/search provider definitions, create, edit, activate/deactivate,
   inspect connector/model counts, and delete only never-used custom definitions.
2. Admins can create a connector from a definition. API keys are sent once,
   encrypted at rest, and never returned by connector responses.
3. Only `OPENAI_COMPATIBLE` is configurable. The model-list response shape is the
   OpenAI list format. Endpoints are paths relative to the public HTTPS base URL.
4. Inactive definitions cannot create new connectors, serve model catalog entries,
   participate in routing, or provide execution config.
5. Provider keys are normalized uppercase and remain the runtime identity from
   connector model catalog through routing and chat config lookup.
6. Built-in compatibility presets preserve their current runtime registry.
7. Built-in provider definitions are seeded and linked to existing connectors.
   Admins may activate or deactivate them, but cannot edit their identity or
   delete them. Deactivation removes them from new connector creation, model
   catalogs, routing snapshots, and runtime config lookup.
