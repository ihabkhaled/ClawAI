# Deployment

Production deployment is driven by [scripts/deploy-prod.sh](https://github.com/ihabkhaled/ClawAI/blob/main/scripts/deploy-prod.sh) and [.github/workflows/deploy-production.yml](https://github.com/ihabkhaled/ClawAI/blob/main/.github/workflows/deploy-production.yml).

The deployment system covers selective service detection, migrations/seeds, service/image updates, frontend maintenance behavior, health verification, deployment state/visibility and release integration.

Infrastructure inputs:
- [docker/docker-compose.prod.services.yml](https://github.com/ihabkhaled/ClawAI/blob/main/docker/docker-compose.prod.services.yml)
- [docker/docker-compose.prod.databases.yml](https://github.com/ihabkhaled/ClawAI/blob/main/docker/docker-compose.prod.databases.yml)
- [infra/nginx/](https://github.com/ihabkhaled/ClawAI/blob/main/infra/nginx)
- [docs/PRODUCTION_DEPLOYMENT.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/PRODUCTION_DEPLOYMENT.md)
