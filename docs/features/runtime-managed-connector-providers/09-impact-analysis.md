# Impact analysis

- **Connector database:** additive definition table, connector FK, and generic
  enum value. New custom definitions become permanently non-deletable once a
  connector has referenced them; deactivation is the reversible lifecycle action.
- **Routing database:** additive generic enum value and nullable runtime key.
- **Chat:** config lookup receives a stable provider key; generic OpenAI-compatible
  requests already use a provider/base URL/model tuple.
- **Auth and billing:** reuses `ADMIN_CONNECTORS_MANAGE`; PAYG policy emits custom
  provider keys and defaults false.
- **Frontend:** `/connectors/providers` sits under the existing `/connectors`
  route permission. Provider and connector forms remain distinct.
- **Migration:** built-in provider definitions link existing connector rows by
  enum identity. Status filters keep inactive providers out of discovery and
  execution while retaining connector and model history.
