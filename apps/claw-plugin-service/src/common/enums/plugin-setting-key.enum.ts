export enum PluginSettingKey {
  USER_SERVERS_ENABLED = 'userServers.enabled',
  USER_SERVERS_REQUIRE_APPROVAL = 'userServers.requireApproval',
  USER_SERVERS_ALLOW_HTTP = 'userServers.allowHttp',
  LOOP_MAX_ROUNDS = 'loop.maxRounds',
  LOOP_MAX_CALLS_PER_TURN = 'loop.maxCallsPerTurn',
  CALL_TIMEOUT_MS = 'call.timeoutMs',
  CALL_MAX_RESULT_BYTES = 'call.maxResultBytes',
  INVOCATIONS_RETENTION_DAYS = 'invocations.retentionDays',
  RATE_PER_USER_PER_MINUTE = 'rate.perUserPerMinute',
  RATE_PER_USER_CONCURRENT = 'rate.perUserConcurrent',
}
