# Pre-release checklist

Before declaring a release candidate ready.

- [ ] Every feature in the release has its pre-PR checklist satisfied
- [ ] All `quality-gates/*.md` pass for every feature
- [ ] Migrations applied against a DB with realistic data (staging)
- [ ] All 7 Docker compose files consistent
- [ ] Nginx config applied; nginx restarted
- [ ] `shared-*` packages built and dependents rebuilt
- [ ] Images rebuilt (not just restarted) for services whose code changed
- [ ] i18n complete in 8 locales
- [ ] Health endpoints green
- [ ] Docker logs clean (no FATAL / UnhandledPromiseRejection)
- [ ] Release notes drafted
- [ ] Rollback plan reviewed + tested
- [ ] Observability dashboards checked
- [ ] On-call notified of release window
