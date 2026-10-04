-- How a provider's API key travels: header name + scheme prefix ("" = raw key).
ALTER TABLE "connector_provider_definitions"
  ADD COLUMN "auth_header_name" TEXT NOT NULL DEFAULT 'Authorization',
  ADD COLUMN "auth_header_scheme" TEXT NOT NULL DEFAULT 'Bearer';
