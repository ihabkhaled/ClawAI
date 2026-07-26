import { AppConfig } from '../../app/config/app.config';

export function buildInterServiceAuthHeader(): string {
  return `Service ${AppConfig.get().INTER_SERVICE_AUTH_TOKEN}`;
}
