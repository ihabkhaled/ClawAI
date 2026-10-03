# Architecture

Connector-service owns `ConnectorProviderDefinition`. A connector keeps its
existing enum column and adds a nullable foreign key; custom rows use
`CUSTOM_OPENAI_COMPATIBLE`. Credentials remain in `Connector.encryptedConfig`.

`ConnectorsManager` loads the linked active definition. Custom definitions
construct the existing `OpenAICompatibleAdapter` with a data-only preset;
built-in presets use `CONNECTOR_PRESETS`, and code-managed built-ins retain
their specialized adapters. Model catalog records resolve the definition key
via the connector relation. The snapshot sends this
key plus adapter-family marker to routing. Routing maps approved compatible
snapshots to its generic enum and stores the provider key in
`ModelDeployment.runtimeProviderKey`; candidates expose the runtime key. Chat
continues to request connector config through the existing connector-service API.

No service reads another service's database. Existing built-in connectors are
backfilled to immutable provider identities without rewriting their connector,
credential, model, exposure, health, or routing data.
