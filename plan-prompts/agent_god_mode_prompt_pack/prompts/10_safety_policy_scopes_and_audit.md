# 10 — Safety, Policy, Scopes, and Audit Prompt

Design the safety system that makes desktop-agent power acceptable for real customers and enterprises.

You must define:
1. scope system:
   - sessions:read
   - commands:execute
   - shell:exec
   - shell:exec-in-repo
   - fs:read
   - fs:write
   - scripts:execute
   - schedule:write
   - repos:write
   - browser:control
   - clipboard:read/write
2. per-device and per-user policy assignment
3. approval policies:
   - always approve
   - always require approval
   - always deny
   - risk-tiered approval
4. dangerous command detection
5. command allow/deny regex catalogs
6. risk scoring and labeling in UI
7. audit log model
8. tamper-evident log chaining
9. anomaly detection heuristics
10. rate limits and cool-downs
11. revocation and lockout paths
12. enterprise controls and admin overrides

Also include:
- privacy considerations
- how to make this self-hosted friendly
- how to explain trust to customers
- how to test that dangerous cases are actually blocked
