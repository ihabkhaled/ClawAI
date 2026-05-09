// Stream 12.2 / 13.3 / 11.4 close-out — seed the env BEFORE any module that
// invokes AppConfig.get() at module-load time (the @Cron decorators in
// AutoSuggestSchedulerManager evaluate at class-load time, which happens as
// the spec file imports it).
process.env['WORKSPACE_DATABASE_URL'] = 'postgres://localhost/test';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['RABBITMQ_URL'] = 'amqp://localhost:5672';
process.env['JWT_SECRET'] = 'a'.repeat(32);
process.env['ENCRYPTION_KEY'] = 'a'.repeat(64);
