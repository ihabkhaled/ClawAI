# 08 — Webapp Connect-Device UX Prompt

Design the full frontend experience for connecting and managing desktop agents in ClawAI.

Current audit problems:
- no Connect CLI page
- no device list
- no revoke button
- no token display page
- terminal page only polls pending approvals
- agent pages are operational, not activation-focused

Create the future UX with these surfaces:
1. `/agent/connect`
2. `/settings/devices`
3. `/agent` overview
4. `/agent/terminal`
5. `/agent/repos`
6. device detail page
7. onboarding banner / empty states
8. connect-from-webapp and connect-from-CLI coexistence

Include:
- IA / navigation
- page purposes
- component breakdown
- loading/error/empty/success states
- approval dialogs
- revoke flows
- "last seen" / health / version badges
- streaming output UI
- device scopes display
- team/admin views
- i18n requirements
- accessibility requirements
- telemetry/analytics events

Also define how these pages guide users to immediate value, not just management.
