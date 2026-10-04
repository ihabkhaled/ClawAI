# Go / no-go

**Current decision: NO-GO for release.** Scoped code gates, local admin API CRUD,
browser CRUD, viewport checks and mocked NVIDIA NIM model discovery passed.
RBAC across non-admin/paid/FREE users, Lighthouse/accessibility/performance,
live NIM chat and GitHub CI are still open.

Release only when required QA lanes are closed with evidence, all migrations
pass clean-install and upgrade validation, and generated
knowledge/inventory gates and GitHub CI are green.
