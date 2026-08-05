import { RuntimeV2RedisOperation } from '../enums/runtime-v2-redis-operation.enum';

const loadBinding = `
for index = 1, #KEYS do
  if redis.call('EXISTS', KEYS[index]) == 0 then return {'MISSING', 'STALE_RUN'} end
end
local state = redis.call('HGETALL', KEYS[1])
if #state == 0 then return {'MISSING', 'STALE_RUN'} end
local bound = {}
for index = 1, #state, 2 do bound[state[index]] = state[index + 1] end
local expected = cjson.decode(ARGV[1])
if bound.ownerId ~= expected.ownerId or bound.threadId ~= expected.threadId or bound.messageId ~= expected.messageId or bound.clientRequestId ~= expected.clientRequestId or bound.runId ~= expected.runId or bound.generation ~= expected.generation then
  return {'MISSING', 'STALE_RUN'}
end
if bound.epochs ~= expected.epochs then return {'CONFLICT', 'STALE_EPOCH'} end
if bound.manifestHash ~= expected.manifestHash or bound.toolCatalogHash ~= expected.toolCatalogHash or bound.provider ~= expected.provider or bound.model ~= expected.model then
  return {'CONFLICT', 'IMMUTABLE_BINDING_MISMATCH'}
end
`;

const refreshKeys = `
for index = 1, #KEYS do
  if redis.call('EXISTS', KEYS[index]) == 1 then redis.call('PEXPIRE', KEYS[index], ARGV[#ARGV]) end
end
`;

const replayCheck = `
local prior = redis.call('HGET', KEYS[3], ARGV[2])
if prior then
  local decoded = cjson.decode(prior)
  if decoded.fingerprint == ARGV[3] then return {'REPLAY', decoded.ack} end
  return {'CONFLICT', 'REPLAY_CONFLICT'}
end
`;

const appendBoundedEvent = `
redis.call('ZADD', KEYS[2], sequence, cjson.encode(event))
local eventCount = redis.call('ZCARD', KEYS[2])
if eventCount > 1000 then redis.call('ZREMRANGEBYRANK', KEYS[2], 0, eventCount - 1001) end
`;

export const RUNTIME_V2_START_SCRIPT = `-- runtime-v2:start
local prior = redis.call('GET', KEYS[1])
local clientPrior = redis.call('GET', KEYS[10])
if prior then
  local decoded = cjson.decode(prior)
  if decoded.fingerprint == ARGV[1] then
    local storedAck = cjson.decode(decoded.ack)
    local proposed = cjson.decode(ARGV[2])
    if storedAck.runId ~= proposed.runId or storedAck.generation ~= proposed.generation then
      return {'REDIRECT', decoded.ack}
    end
    for index = 2, #KEYS do
      if redis.call('EXISTS', KEYS[index]) == 0 then return {'MISSING', 'STALE_RUN'} end
    end
    local decodedClient = cjson.decode(clientPrior)
    if decodedClient.fingerprint ~= ARGV[1] or decodedClient.ack ~= decoded.ack then
      return {'CONFLICT', 'START_REPLAY_CONFLICT'}
    end
    return {'REPLAY', decoded.ack}
  end
  return {'CONFLICT', 'START_REPLAY_CONFLICT'}
end
if clientPrior then
  local decodedClient = cjson.decode(clientPrior)
  if decodedClient.fingerprint == ARGV[1] then return {'MISSING', 'STALE_RUN'} end
  return {'CONFLICT', 'START_REPLAY_CONFLICT'}
end
if redis.call('EXISTS', KEYS[2]) == 1 or redis.call('EXISTS', KEYS[4]) == 1 then
  return {'CONFLICT', 'IDENTITY_COLLISION'}
end
local proposed = cjson.decode(ARGV[2])
local snapshot = cjson.decode(ARGV[3])
redis.call('HSET', KEYS[2],
  'ownerId', snapshot.ownerId, 'threadId', snapshot.threadId, 'messageId', snapshot.messageId,
  'clientRequestId', snapshot.clientRequestId, 'idempotencyKey', snapshot.idempotencyKey,
  'runId', proposed.runId, 'generation', proposed.generation, 'epochs', snapshot.epochs,
  'manifestHash', snapshot.manifestHash, 'toolCatalogHash', snapshot.toolCatalogHash,
  'toolDefinitions', snapshot.toolDefinitions,
  'provider', snapshot.provider, 'model', snapshot.model, 'lifecycle', 'active',
  'sequence', '0', 'nextSteeringSequence', '0', 'terminalized', '0', 'claimed', '0',
  'budget', cjson.encode(snapshot.budget), 'toolCalls', '0', 'toolResultBytes', '0')
redis.call('ZADD', KEYS[3], 0, ARGV[4])
redis.call('SET', KEYS[4], ARGV[5])
redis.call('SET', KEYS[1], cjson.encode({fingerprint=ARGV[1], ack=ARGV[6]}))
redis.call('SET', KEYS[10], cjson.encode({fingerprint=ARGV[1], ack=ARGV[6]}))
redis.call('HSET', KEYS[5], 'start:' .. snapshot.idempotencyKey, cjson.encode({fingerprint=ARGV[1], ack=ARGV[6]}))
redis.call('HSET', KEYS[6], '__initialized', '1')
redis.call('HSET', KEYS[7], '__initialized', '1')
redis.call('ZADD', KEYS[8], -1, '__initialized')
redis.call('HSET', KEYS[9], '__initialized', '1')
${refreshKeys}
return {'OK', ARGV[6]}
`;

export const RUNTIME_V2_INVOCATION_SCRIPT = `-- runtime-v2:invocation
${loadBinding}
${replayCheck}
if bound.lifecycle ~= 'active' then return {'DENIED', 'RUN_TERMINAL'} end
if redis.call('HEXISTS', KEYS[4], ARGV[4]) == 1 then return {'CONFLICT', 'INVOCATION_CONFLICT'} end
local budget = cjson.decode(bound.budget)
if tonumber(bound.toolCalls) + 1 > budget.maxToolCalls then return {'DENIED', 'BUDGET_EXHAUSTED'} end
local requestedSequence = redis.call('HINCRBY', KEYS[1], 'sequence', 1)
local event = cjson.decode(ARGV[7]); event.sequence = requestedSequence
local sequence = requestedSequence
redis.call('HSET', KEYS[4], ARGV[4], ARGV[5])
redis.call('HINCRBY', KEYS[1], 'toolCalls', 1)
${appendBoundedEvent}
sequence = redis.call('HINCRBY', KEYS[1], 'sequence', 1)
local ack = cjson.decode(ARGV[6]); ack.sequence = sequence
local ackJson = cjson.encode(ack)
event = cjson.decode(ARGV[8]); event.sequence = sequence
redis.call('HSET', KEYS[3], ARGV[2], cjson.encode({fingerprint=ARGV[3], ack=ackJson}))
${appendBoundedEvent}
${refreshKeys}
return {'OK', ackJson}
`;

export const RUNTIME_V2_RESULT_SCRIPT = `-- runtime-v2:result
${loadBinding}
${replayCheck}
if bound.lifecycle ~= 'active' then return {'DENIED', 'RUN_TERMINAL'} end
local invocationArgumentHash = redis.call('HGET', KEYS[4], ARGV[4])
if not invocationArgumentHash then return {'MISSING', 'UNKNOWN_INVOCATION'} end
local priorResult = redis.call('HGET', KEYS[5], ARGV[4])
if priorResult then
  local decoded = cjson.decode(priorResult)
  if decoded.fingerprint == ARGV[3] then return {'REPLAY', decoded.ack} end
  return {'CONFLICT', 'RESULT_CONFLICT'}
end
local verification = cjson.decode(ARGV[5])
if invocationArgumentHash ~= verification.argumentHash then return {'DENIED', 'RECEIPT_ARGUMENT_MISMATCH'} end
local budget = cjson.decode(bound.budget)
local resultBytes = tonumber(verification.outputBytes)
if not resultBytes or resultBytes < 0 then return {'DENIED', 'INVALID_RESULT_SIZE'} end
local nextResultBytes = tonumber(bound.toolResultBytes) + resultBytes
if nextResultBytes > budget.maxToolResultBytes then return {'DENIED', 'BUDGET_EXHAUSTED'} end
local sequence = redis.call('HINCRBY', KEYS[1], 'sequence', 1)
local ack = cjson.decode(ARGV[6]); ack.sequence = sequence
local ackJson = cjson.encode(ack)
local event = cjson.decode(ARGV[7]); event.sequence = sequence
redis.call('HSET', KEYS[5], ARGV[4], cjson.encode({fingerprint=ARGV[3], ack=ackJson, receipt=verification}))
redis.call('HSET', KEYS[1], 'toolResultBytes', nextResultBytes)
redis.call('HSET', KEYS[3], ARGV[2], cjson.encode({fingerprint=ARGV[3], ack=ackJson}))
${appendBoundedEvent}
${refreshKeys}
return {'OK', ackJson}
`;

export const RUNTIME_V2_STEERING_SCRIPT = `-- runtime-v2:steering
${loadBinding}
${replayCheck}
if bound.lifecycle ~= 'active' then return {'DENIED', 'RUN_TERMINAL'} end
local steering = cjson.decode(ARGV[5])
if tonumber(bound.nextSteeringSequence) ~= steering.sequence then return {'CONFLICT', 'STEERING_GAP'} end
if redis.call('HEXISTS', KEYS[5], steering.steeringId) == 1 then return {'CONFLICT', 'STEERING_CONFLICT'} end
local sequence = redis.call('HINCRBY', KEYS[1], 'sequence', 1)
local ack = cjson.decode(ARGV[6]); ack.sequence = sequence
local ackJson = cjson.encode(ack)
local event = cjson.decode(ARGV[7]); event.sequence = sequence
redis.call('HSET', KEYS[1], 'nextSteeringSequence', steering.sequence + 1)
redis.call('ZREM', KEYS[6], '__initialized')
redis.call('HDEL', KEYS[7], '__initialized')
local steeringCount = redis.call('ZCARD', KEYS[6])
if steeringCount >= 1000 then
  local oldest = redis.call('ZRANGE', KEYS[6], 0, steeringCount - 1000)
  for index = 1, #oldest do
    local oldestData = redis.call('HGET', KEYS[7], oldest[index])
    if oldestData then
      local decodedOldest = cjson.decode(oldestData)
      local oldestSteering = cjson.decode(decodedOldest.steering)
      redis.call('HDEL', KEYS[3], oldestSteering.idempotencyKey)
    end
    redis.call('ZREM', KEYS[6], oldest[index])
    redis.call('HDEL', KEYS[7], oldest[index])
  end
end
redis.call('ZADD', KEYS[6], steering.sequence, steering.steeringId)
redis.call('HSET', KEYS[7], steering.steeringId, cjson.encode({fingerprint=ARGV[3], ack=ackJson, steering=ARGV[5]}))
redis.call('HSET', KEYS[3], ARGV[2], cjson.encode({fingerprint=ARGV[3], ack=ackJson}))
${appendBoundedEvent}
${refreshKeys}
return {'OK', ackJson}
`;

export const RUNTIME_V2_CANCEL_SCRIPT = `-- runtime-v2:cancel
${loadBinding}
${replayCheck}
if bound.lifecycle ~= 'active' then return {'DENIED', 'RUN_TERMINAL'} end
local sequence = redis.call('HINCRBY', KEYS[1], 'sequence', 1)
local ack = cjson.decode(ARGV[5]); ack.sequence = sequence
local ackJson = cjson.encode(ack)
local event = cjson.decode(ARGV[6]); event.sequence = sequence
redis.call('HSET', KEYS[1], 'lifecycle', 'cancelled', 'terminalized', '1')
redis.call('HSET', KEYS[3], ARGV[2], cjson.encode({fingerprint=ARGV[3], ack=ackJson}))
${appendBoundedEvent}
${refreshKeys}
return {'OK', ackJson}
`;

export const RUNTIME_V2_CLAIM_SCRIPT = `-- runtime-v2:claim
${loadBinding}
if bound.lifecycle ~= 'active' then return {'DENIED', 'RUN_TERMINAL'} end
local mappingJson = redis.call('GET', KEYS[8])
if not mappingJson then return {'MISSING', 'STALE_RUN'} end
local mapping = cjson.decode(mappingJson)
local expectedMapping = cjson.decode(ARGV[4])
if mapping.runId ~= expectedMapping.runId or mapping.generation ~= expectedMapping.generation or mapping.ownerId ~= expectedMapping.ownerId or mapping.threadId ~= expectedMapping.threadId or mapping.messageId ~= expectedMapping.messageId or mapping.clientRequestId ~= expectedMapping.clientRequestId or mapping.manifestHash ~= expectedMapping.manifestHash or mapping.toolCatalogHash ~= expectedMapping.toolCatalogHash or mapping.provider ~= expectedMapping.provider or mapping.model ~= expectedMapping.model then
  return {'MISSING', 'STALE_RUN'}
end
local prior = redis.call('HGET', KEYS[3], ARGV[2])
if prior then
  local decoded = cjson.decode(prior)
  if decoded.fingerprint == ARGV[3] then return {'REPLAY', decoded.ack} end
  return {'DENIED', 'ALREADY_CLAIMED'}
end
if bound.claimed == '1' then return {'DENIED', 'ALREADY_CLAIMED'} end
local sequence = redis.call('HINCRBY', KEYS[1], 'sequence', 1)
local ack = cjson.decode(ARGV[5]); ack.sequence = sequence
local ackJson = cjson.encode(ack)
local event = cjson.decode(ARGV[6]); event.sequence = sequence
redis.call('HSET', KEYS[1], 'claimed', '1', 'claimId', ack.claimId, 'providerDispatch', 'not-started')
redis.call('HSET', KEYS[3], ARGV[2], cjson.encode({fingerprint=ARGV[3], ack=ackJson}))
${appendBoundedEvent}
${refreshKeys}
return {'CLAIMED', ackJson}
`;

export const RUNTIME_V2_TERMINAL_SCRIPT = `-- runtime-v2:terminal
${loadBinding}
${replayCheck}
if bound.lifecycle ~= 'active' or bound.terminalized == '1' then return {'DENIED', 'RUN_TERMINAL'} end
if not bound.claimId or bound.claimId ~= ARGV[4] then return {'MISSING', 'STALE_CLAIM'} end
local sequence = redis.call('HINCRBY', KEYS[1], 'sequence', 1)
local terminal = cjson.decode(ARGV[5])
local ack = cjson.decode(ARGV[6]); ack.sequence = sequence
local ackJson = cjson.encode(ack)
local event = cjson.decode(ARGV[7]); event.sequence = sequence
redis.call('HSET', KEYS[1], 'lifecycle', terminal.status, 'terminalized', '1')
redis.call('HSET', KEYS[3], ARGV[2], cjson.encode({fingerprint=ARGV[3], ack=ackJson}))
${appendBoundedEvent}
${refreshKeys}
return {'OK', ackJson}
`;

export const RUNTIME_V2_DISPATCH_SCRIPT = `-- runtime-v2:dispatch
${loadBinding}
${replayCheck}
if bound.lifecycle ~= 'active' then return {'DENIED', 'RUN_TERMINAL'} end
if not bound.claimId or bound.claimId ~= ARGV[4] then return {'MISSING', 'STALE_CLAIM'} end
if bound.providerDispatch ~= 'not-started' then return {'DENIED', 'PROVIDER_DISPATCH_AMBIGUOUS'} end
local sequence = redis.call('HINCRBY', KEYS[1], 'sequence', 1)
local ack = cjson.decode(ARGV[5]); ack.sequence = sequence
local ackJson = cjson.encode(ack)
local event = cjson.decode(ARGV[6]); event.sequence = sequence
redis.call('HSET', KEYS[1], 'providerDispatch', 'dispatched')
redis.call('HSET', KEYS[3], ARGV[2], cjson.encode({fingerprint=ARGV[3], ack=ackJson}))
${appendBoundedEvent}
${refreshKeys}
return {'OK', ackJson}
`;

export const RUNTIME_V2_READ_SCRIPT = `-- runtime-v2:read
${loadBinding}
local after = tonumber(ARGV[2])
local oldest = redis.call('ZRANGE', KEYS[2], 0, 0, 'WITHSCORES')
if #oldest == 2 and after < tonumber(oldest[2]) - 1 then return {'CONFLICT', 'REPLAY_GAP'} end
local members = redis.call('ZRANGEBYSCORE', KEYS[2], '(' .. after, '+inf', 'LIMIT', 0, 1000)
-- The events list is assembled as JSON text rather than handed to cjson.encode
-- inside a table, because cjson cannot tell an empty ARRAY from an empty OBJECT
-- and encodes both as {}. The stream polls on an interval and most polls return
-- nothing new, so "events":{} was the common case, not an edge case — it failed
-- the read schema ("expected array, received object"), errored the SSE
-- observable, and reached the extension as "stream returned an invalid event".
local eventsJson = '[]'
if #members > 0 then eventsJson = cjson.encode(members) end
return {'OK', '{"runId":' .. cjson.encode(expected.runId) ..
  ',"terminal":' .. tostring(bound.lifecycle ~= 'active') ..
  ',"events":' .. eventsJson .. '}'}
`;

// Appends the model's own output to the journal: the turn marker, the answer
// text, and the closing summary.
//
// Without these the run streamed lifecycle and tool events only, so a client
// watching the stream saw a run start, dispatch, call tools and complete —
// while the assistant's actual answer went to the database and nowhere else.
// The three events are appended under one sequence allocation each so their
// order on the journal is the order they happened.
export const RUNTIME_V2_MODEL_OUTPUT_SCRIPT = `-- runtime-v2:model-output
${loadBinding}
${replayCheck}
if bound.lifecycle ~= 'active' then return {'DENIED', 'RUN_TERMINAL'} end
if not bound.claimId or bound.claimId ~= ARGV[4] then return {'MISSING', 'STALE_CLAIM'} end
local payloads = cjson.decode(ARGV[6])
local sequence = 0
for index = 1, #payloads do
  sequence = redis.call('HINCRBY', KEYS[1], 'sequence', 1)
  local event = payloads[index]; event.sequence = sequence
  ${appendBoundedEvent}
end
local ack = cjson.decode(ARGV[5]); ack.sequence = sequence
local ackJson = cjson.encode(ack)
redis.call('HSET', KEYS[3], ARGV[2], cjson.encode({fingerprint=ARGV[3], ack=ackJson}))
${refreshKeys}
return {'OK', ackJson}
`;

export const RUNTIME_V2_BINDING_SCRIPT = `-- runtime-v2:binding
if redis.call('EXISTS', unpack(KEYS)) ~= #KEYS then return {'MISSING', 'STALE_RUN'} end
local ownerId = redis.call('HGET', KEYS[1], 'ownerId')
local threadId = redis.call('HGET', KEYS[1], 'threadId')
local runId = redis.call('HGET', KEYS[1], 'runId')
local generation = redis.call('HGET', KEYS[1], 'generation')
if ownerId ~= ARGV[1] or threadId ~= ARGV[2] or runId ~= ARGV[3] or generation ~= ARGV[4] then
  return {'MISSING', 'STALE_RUN'}
end
local result = {
  ownerId=ownerId,
  threadId=threadId,
  messageId=redis.call('HGET', KEYS[1], 'messageId'),
  clientRequestId=redis.call('HGET', KEYS[1], 'clientRequestId'),
  startIdempotencyKey=redis.call('HGET', KEYS[1], 'idempotencyKey'),
  runId=runId,
  generation=generation,
  epochs=cjson.decode(redis.call('HGET', KEYS[1], 'epochs')),
  manifestHash=redis.call('HGET', KEYS[1], 'manifestHash'),
  toolCatalogHash=redis.call('HGET', KEYS[1], 'toolCatalogHash'),
  -- Deliberately returned as the STORED JSON STRING, not cjson.decode'd. The
  -- binding is validated by a schema whose superRefine re-hashes
  -- JSON.stringify(toolDefinitions) and compares it to toolCatalogHash, so a
  -- cjson decode/encode round trip could reorder object keys and fail a catalog
  -- that is perfectly valid. The caller parses this field itself, which keeps
  -- the exact bytes that produced the hash. This mirrors the message-binding
  -- script, which returns its blob verbatim for the same reason.
  toolDefinitions=redis.call('HGET', KEYS[1], 'toolDefinitions'),
  provider=redis.call('HGET', KEYS[1], 'provider'),
  model=redis.call('HGET', KEYS[1], 'model')
}
local claimId = redis.call('HGET', KEYS[1], 'claimId')
if claimId then result.claimId = claimId end
return {'OK', cjson.encode(result)}
`;

export const RUNTIME_V2_MESSAGE_BINDING_SCRIPT = `-- runtime-v2:message-binding
local mappingJson = redis.call('GET', KEYS[1])
if not mappingJson then return {'MISSING', 'STALE_RUN'} end
local mapping = cjson.decode(mappingJson)
if mapping.messageId ~= ARGV[1] or mapping.threadId ~= ARGV[2] or mapping.provider ~= ARGV[3] or mapping.model ~= ARGV[4] then
  return {'MISSING', 'STALE_RUN'}
end
return {'OK', mappingJson}
`;

export const RUNTIME_V2_REDIS_SCRIPTS: Readonly<Record<RuntimeV2RedisOperation, string>> = {
  [RuntimeV2RedisOperation.START]: RUNTIME_V2_START_SCRIPT,
  [RuntimeV2RedisOperation.ADMIT_INVOCATION]: RUNTIME_V2_INVOCATION_SCRIPT,
  [RuntimeV2RedisOperation.RESULT]: RUNTIME_V2_RESULT_SCRIPT,
  [RuntimeV2RedisOperation.STEERING]: RUNTIME_V2_STEERING_SCRIPT,
  [RuntimeV2RedisOperation.CANCEL]: RUNTIME_V2_CANCEL_SCRIPT,
  [RuntimeV2RedisOperation.CLAIM_ROUTED]: RUNTIME_V2_CLAIM_SCRIPT,
  [RuntimeV2RedisOperation.MARK_DISPATCHED]: RUNTIME_V2_DISPATCH_SCRIPT,
  [RuntimeV2RedisOperation.APPEND_MODEL_OUTPUT]: RUNTIME_V2_MODEL_OUTPUT_SCRIPT,
  [RuntimeV2RedisOperation.TERMINAL]: RUNTIME_V2_TERMINAL_SCRIPT,
  [RuntimeV2RedisOperation.READ_EVENTS]: RUNTIME_V2_READ_SCRIPT,
  [RuntimeV2RedisOperation.READ_BINDING]: RUNTIME_V2_BINDING_SCRIPT,
  [RuntimeV2RedisOperation.READ_MESSAGE_BINDING]: RUNTIME_V2_MESSAGE_BINDING_SCRIPT,
};
