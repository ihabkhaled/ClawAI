# Security analysis

- Backend provider endpoints require `ADMIN_CONNECTORS_MANAGE`; DTOs reject
  unknown properties and bound strings, list limits, and endpoint paths.
- Cloud URLs require HTTPS, reject embedded credentials and common local/private
  hosts and IP ranges. The shared outbound HTTP wrapper enforces its explicit
  host declaration, timeout, and `redirect: 'error'`.
- Admin-configured endpoints are a sensitive outbound-request surface. DNS
  resolution is not pinned by this implementation; network egress controls are
  still required for deployments exposed to untrusted administrators.
- No admin input becomes code, adapter class, headers, or arbitrary response
  parsing. No provider secret is part of definition output or audit metadata.
- Credential persistence reuses the existing AES-256-GCM connector code.
- Used definitions are retained after connector deletion to preserve downstream
  runtime/cost identities.
