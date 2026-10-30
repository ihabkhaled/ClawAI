# Paid model access

## Access contract

Model prices are classified as `FREE`, `CHEAP`, `STANDARD`, `PREMIUM`, or
`ULTRA`. Free plans receive the first three classes. Paid plans receive all
five by default. Administrators can change each plan's allowed classes in the
plan model-access editor. Missing or unknown model pricing fails closed for a
class-restricted plan.

The shared entitlements package defines the class-aware access contract.
Auth admission checks selected primary models, chat checks model roles, and
routing filters automatic selections and fallback candidates. The UI and
marketing pricing cards show configured class grants, but backend admission is
authoritative. The model pickers dim a model the plan excludes and tag it "Not on
your plan" ([ADR-198](../../13-adr/adr-198-model-pickers-show-the-plan-decision-and-dim-what-it-excludes.md));
the server answers which, with the function the send uses.

Pricing behavior and frontend surfaces are documented in
[admin model billing and exposure](../../05-frontend/admin-model-billing-and-exposure.md).
The implementation and QA evidence are linked from the
[change record](../../changes/2026-10-27-paid-model-access-and-thread-retry-recovery.md).
