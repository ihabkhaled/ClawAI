# Security

Security is enforced across application code, repository rules, infrastructure and local developer-agent boundaries.

## Major controls
- authentication/session controls and RBAC;
- strict service-owned persistence boundaries;
- input/runtime validation;
- secret redaction and frontend secret prohibition;
- connector credential protection;
- file-upload/attachment safety;
- SSRF defenses for web fetch/crawl;
- TLS/Nginx boundary;
- rate limiting and reliability controls;
- Coding Agent Workspace Trust, path containment, permission modes, secret exclusions, safe/atomic edits and CSP.

Canonical references:
- [.github/SECURITY.md](https://github.com/ihabkhaled/ClawAI/blob/main/.github/SECURITY.md)
- [rules/08-security-rules.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/08-security-rules.md)
- [rules/16-authentication-and-authorization.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/16-authentication-and-authorization.md)
- [rules/21-security-and-secrets.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/21-security-and-secrets.md)
- [docs/SECURITY_HARDENING_ARCHITECTURE.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/SECURITY_HARDENING_ARCHITECTURE.md)
- [work/skills/security/](https://github.com/ihabkhaled/ClawAI/blob/main/work/skills/security)
