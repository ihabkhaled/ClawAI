# Runbook: Routing Misclassification

## Symptoms

- User asks a coding question but gets routed to a general chat model
- Reasoning tasks are handled by a fast, low-quality model
- Privacy-sensitive content is sent to a cloud provider
- The routing decision shows low confidence or incorrect reason tags
- Users report "wrong model" for their queries

## Diagnosis Steps

### 1. Check the Routing Decision

Every message has a routing decision stored in the database. Check what the router decided:

```bash
# Get recent routing decisions
curl -s http://localhost:4000/api/v1/routing/decisions?limit=10 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Look at:
- `selectedProvider` / `selectedModel` -- what was chosen
- `confidence` -- how confident the router was (0.0 to 1.0)
- `reasonTags` -- why this model was chosen
- `routingMode` -- which routing mode was active

### 2. Check the Thread's Routing Mode

```bash
# Get thread details
curl -s http://localhost:4000/api/v1/chat-threads/<thread-id> \
  -H "Authorization: Bearer $TOKEN" | jq '{routingMode, preferredProvider, preferredModel}'
```

If `routingMode` is `MANUAL_MODEL`, the user explicitly selected the provider/model. If `AUTO`, the router made the decision.

### 3. Check Keyword Detection

The keyword detection layer runs before the LLM router. Verify it is matching correctly:

```bash
# Check routing service logs for keyword matches
docker compose -f docker-compose.dev.yml logs --tail=100 routing-service | grep -i "keyword\|category\|detected"
```

### 4. Check the Dynamic Router Prompt

The router prompt is built dynamically from installed models:

```bash
# Check what models the router knows about
docker compose -f docker-compose.dev.yml logs --tail=50 routing-service | grep -i "prompt\|installed\|model"
```

### 5. Check Installed Models and Roles

```bash
# List installed models and their roles
curl -s http://localhost:4000/api/v1/ollama/models \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {name, roles: .roleAssignments}'
```

If no model has the `LOCAL_CODING` role assigned, coding tasks cannot be routed to a local coding model.

## Common Misclassification Scenarios

### Coding Task Routed to General Chat

**Cause**: The message did not contain enough coding keywords (needs 2+ matches), and the LLM router did not recognize it as coding.

**Fix**:
1. Check the keyword list in routing constants:
   ```
   apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts
   ```
2. Add missing keywords. Example: if "deploy" triggers coding but should not, remove it. If "terraform" should trigger coding but does not, add it.
3. Restart routing-service: `docker compose -f docker-compose.dev.yml restart routing-service`

### Privacy-Sensitive Content Sent to Cloud

**Cause**: The routing mode is not `LOCAL_ONLY` or `PRIVACY_FIRST`, and the router did not detect privacy sensitivity.

**Fix**:
1. The user should switch to `LOCAL_ONLY` or `PRIVACY_FIRST` routing mode for sensitive conversations
2. If AUTO mode should detect privacy sensitivity, check the privacy detection keywords in the routing constants
3. Consider adding a routing policy that forces local routing for specific patterns

### Wrong Category Detection (False Positive)

**Cause**: Common words match coding keywords. Example: "I have a class tomorrow" matches "class" as a coding keyword.

**Fix**: The system requires 2+ keyword matches for a strong match. If single-word false positives are causing issues:

1. Remove ambiguous keywords from the list (e.g., "class" is ambiguous)
2. Or increase the threshold for strong match from 2 to 3 keywords
3. The constant is in:
   ```
   apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts
   ```

### LLM Router Returns Invalid Response

**Cause**: The local router model (gemma3:4b) produced malformed JSON or hallucinated a provider/model.

**Fix**:
1. Check routing-service logs for Zod validation errors
2. The response is Zod-validated. Invalid responses fall through to heuristic routing.
3. If this happens frequently, consider:
   - Using a larger router model (`OLLAMA_ROUTER_MODEL` env var)
   - Setting router temperature to 0 (deterministic)
   - Simplifying the router prompt

## Updating Keywords

Keywords are defined as constants in the routing service:

```
apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts
```

### Current Keyword Counts

| Category  | Keywords | Examples                                    |
| --------- | -------- | ------------------------------------------- |
| Coding    | 28       | function, debug, compile, refactor, API     |
| Reasoning | 21       | analyze, evaluate, compare, logic, theorem  |
| Thinking  | 15       | research, investigate, explore, brainstorm  |

### Adding a New Keyword

1. Edit the constants file and add the keyword to the appropriate array
2. Ensure the keyword is not ambiguous (does it apply only to this category?)
3. Restart routing-service
4. Test with sample messages:

```bash
# Send a test message
curl -X POST http://localhost:4000/api/v1/chat-messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threadId": "<test-thread>", "content": "Your test message with new keyword"}'

# Check the routing decision
curl -s http://localhost:4000/api/v1/routing/decisions?limit=1 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## Testing Routing Changes

After modifying keywords or routing logic:

1. Prepare test messages for each category (5-10 per category)
2. Send each through the API and check the routing decision
3. Verify:
   - Coding messages route to coding models
   - Reasoning messages route to reasoning models
   - General messages route to default models
   - Privacy-sensitive messages stay local
4. Check for false positives by sending ambiguous messages

## Prevention

- Review routing decisions periodically via the audit log
- Monitor low-confidence routing decisions (confidence < 0.5)
- Keep keyword lists curated -- remove ambiguous terms
- Test routing after every keyword or prompt change
