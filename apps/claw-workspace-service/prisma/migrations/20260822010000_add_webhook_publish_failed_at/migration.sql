-- Post-pack hardening — durable signal for the gap Phase 15's chaos tests
-- found: publish() always swallows a RabbitMQ failure (by design, so the
-- webhook HTTP response never depends on RabbitMQ), but nothing previously
-- recorded that swallow anywhere queryable.
ALTER TABLE "webhook_deliveries" ADD COLUMN "publish_failed_at" TIMESTAMP(3);

CREATE INDEX "webhook_deliveries_publish_failed_at_idx"
  ON "webhook_deliveries"("publish_failed_at");
