import { AppConfig } from '../../../app/config/app.config';

/** routing-service's base URL (rate card for the enhancement estimate). */
export function routingServiceUrl(): string | null {
  const value = AppConfig.get().ROUTING_SERVICE_URL;
  return value === '' ? null : value;
}
