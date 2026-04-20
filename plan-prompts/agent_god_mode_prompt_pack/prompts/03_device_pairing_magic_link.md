# 03 — Magic-Link Device Pairing Prompt

Implement the primary browser-based device-pairing experience for ClawAI desktop agent.

The target experience:
- user runs `claw-agent login`
- CLI opens browser or prints a URL
- webapp shows a polished "Connect this device" approval screen
- user approves once
- CLI receives durable credentials and stores them securely
- user never has to copy tokens or log in again unless revoked or very long-lived refresh expires

Your output must include:
1. full UX flow from CLI to browser to callback back to CLI
2. loopback listener design and fallback behavior if port binding fails
3. exact pairing request model
4. exact backend endpoints and payloads
5. frontend page design and messaging
6. OS/device metadata collected and why
7. anti-CSRF / anti-replay / code expiry rules
8. abuse and failure cases:
   - code reused
   - callback never reached
   - browser opened under wrong account
   - code expired
   - user cancels
   - multiple CLIs racing same code
9. CLI ergonomics:
   - `login`
   - `login --no-open`
   - `login --json`
   - `login --device-name`
10. acceptance criteria and test matrix

Do not keep this generic. Write it as if you will hand it to engineers tomorrow.
