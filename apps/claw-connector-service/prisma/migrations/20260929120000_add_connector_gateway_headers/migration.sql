-- LLM-gateway headers (F092).
--
-- Extra request headers a gateway in front of the provider needs (Portkey's
-- `x-portkey-api-key`, Helicone's `Helicone-Auth`, Cloudflare AI Gateway's
-- `cf-aig-authorization`). Stored encrypted — the values are credentials — as
-- one JSON object. Nullable: every existing connector has none.
ALTER TABLE "connectors" ADD COLUMN "encrypted_gateway_headers" TEXT;
