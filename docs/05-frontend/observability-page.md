# The /observability page

Admin-only (`Permission.ADMIN_SYSTEM_VIEW`, `route-permissions.constants.ts`).
It answers two questions, in this order:

1. **Is the platform up, and has it been?** The service-status section
   (observability plan B3).
2. **What is the AI usage costing?** The usage overview: requests, cost,
   latency, high-severity audit events.

```
page.tsx (render only)
├── useServiceStatus()     → healthRepository.getStatusPage()  → GET /api/v1/health/status
│   └── <ServiceStatusSection>
│         ├── <ComponentStatusRow> × 10   (state + uptime 24 h / 7 d / 30 d)
│         │     └── <ComponentStateBadge>
│         └── <StatusIncidentList>        (last 7 days, newest first)
└── useObservabilityPage() → auditRepository.*                 → /api/v1/usage/*, /audits/stats
    └── <UsageOverview>    (own loading / error / empty states)
```

The two halves load and fail independently. Before B3 an empty usage ledger
returned early and the page showed nothing else; the usage states now live
inside `UsageOverview`, so a fresh install still shows service health.

## The service-status section

| Piece                   | File                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| Hook (BACKGROUND poll)  | `src/hooks/observability/use-service-status.ts`                          |
| Types / prop types      | `src/types/service-status.types.ts`, `service-status-component.types.ts` |
| Enums (mirror the API)  | `src/enums/{status-component,component-state,uptime-window}.enum.ts`     |
| Label keys, state looks | `src/constants/service-status.constants.ts`                              |
| Formatting              | `src/utilities/service-status.utility.ts`                                |
| i18n                    | `observability.status.*` in all 13 locales + `i18n.types.ts`             |

### What it shows, and what it never shows

- **Components, not services.** Ten coarse groups — Sign-in and accounts,
  Chat, Files, Image generation, Research, Payments, Workspaces, Coding agent,
  Local models, Logs and audit. The API has no field that could carry a
  service name, host, port, version or error message; health-service's spec
  serialises the response and asserts that.
- **State in words.** Operational / Degraded / Down / Unknown is always text.
  The icon and colour repeat it (never colour alone), and every text colour
  clears 4.5:1 on the card in both themes.
- **Uptime** as a two-decimal localized percentage from integer basis points
  (`Intl.NumberFormat`, so Arabic and Persian get their own digits). A window
  with no samples says "No data", not 100 %. A window measured for less than
  99 % of its length says how much was measured.
- **Incidents** for the last 7 days: component, worst state reached, start
  (`<time datetime>`), and "Lasted …" or "Ongoing for …" via
  `Intl.NumberFormat` units.
- **History unavailable.** When Prometheus cannot be read the section keeps
  the live state and says the history is missing, instead of showing zeros.

### Why these numbers are conservative

History is counted in 5-minute buckets. A bucket counts against a component if
**any** check in it failed, so a 15-second blip costs five minutes. The page
says so in its footnote. 90-day uptime does not exist: Prometheus keeps 30 days
(ADR-113).

### Layout

One column below `md`: name and state on a line, then the three windows as a
3-column grid. From `md`: name/state on the left, windows on the right.
Everything is flex/grid with logical spacing, so RTL mirrors without special
cases. Verified widths: 320, 375, 768, 1440.

## Related

- Backend: [service-guide-health.md](../04-backend/service-guide-health.md) §
  Status page.
- Operating it: [skills/watch-production-health.md](../../skills/watch-production-health.md).
- Something shows degraded: [runbook-status-page-degraded.md](../11-runbooks/runbook-status-page-degraded.md).
- Plan: [observability-plan.md](../implementation/observability-plan.md) B3.
