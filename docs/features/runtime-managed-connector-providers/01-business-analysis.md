# Business analysis

## Need

Adding an OpenAI-compatible provider currently requires code, an enum value and a
deployment. This blocks operators from connecting gateways and hosted model APIs
that already implement the shared protocol.

## Business rules

- Provider metadata and encrypted account credentials are separate records.
- Unknown providers default to included/free classification (`false` PAYG).
- Only an explicit connector PAYG setting can classify a new connection as
  metered; unverified prices stay unknown.
- A definition can be deactivated without deleting connector/model history.
- Definitions used by connectors remain undeletable, even after those connectors
  are removed, so routing and cost history cannot become an orphaned identity.
- Free-tier metadata means an upstream advertises a free tier; it is not a promise
  of unlimited use or zero cost.

## Pack 2 business validation

NVIDIA NIM is the compatible-path example. Its test fixture uses
`https://integrate.api.nvidia.com` and `/v1/models`; the test does not assert live
availability, current pricing, or an unlimited free tier. Other three providers
remain outside this adapter contract.
