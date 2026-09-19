# Generated Manifests

The machine-readable manifests under `.ai/manifests/` are the highest-fidelity repository inventory for structural facts.

## Current facts

- Services: **18**
- Shared packages: **6**
- Test files: **1281**
- API endpoints: **662**
- Event graph entries: **178**
- Environment variables: **355**
- Nginx routes: **59**

## Rule

Generated manifests are **read-only reasoning inputs**. Do not hand-edit them. Structural changes are made in source and then regenerated through the Knowledge OS tooling.

## Why they exist

They let tooling and coding agents answer questions such as:

- Which service owns this endpoint or database model?
- Which workspaces are affected by this change?
- Which event producers/consumers form a flow?
- Which variables, ports, routes, permissions, and tests belong to an area?
- Is the documentation still consistent with the current tree?

See [[AI-Native-Engineering-OS]] and [[Quality-Gates]].
