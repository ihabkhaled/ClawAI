# 04 — Device-Code Fallback and Headless Prompt

Design the headless fallback for environments where the CLI cannot open a browser or receive a loopback callback.

Examples:
- SSH session
- container
- CI job
- WSL shell without browser access
- locked-down enterprise environment

You must implement a device-code style flow similar in spirit to RFC 8628:
- create device code
- print verification URL and user code
- poll for completion
- retrieve token pair after approval

Deliver:
1. the exact backend endpoints
2. payloads and polling contract
3. DB state model for pending device-code authorizations
4. expiry, retry interval, max polling behavior
5. frontend verify-code page
6. CLI UX and terminal output
7. security controls
8. differences between GUI pairing and headless pairing
9. when the CLI should choose fallback automatically
10. tests and abuse cases

Also define how this works in self-hosted deployments where the webapp domain may vary.
