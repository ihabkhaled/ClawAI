#!/usr/bin/env bash
# qa/test-multimodal.sh — live API lane for the multimodal orchestration program
# (docs/implementation/multimodal-orchestration-plan.md, batches 1–10b).
#
# Runs against the real stack through nginx (https://claw.local by default):
# image → helper vision / no-vision note, voice → metered transcription, video →
# ffmpeg job + timestamped transcript + frames/native delivery, chat image
# generation (paid vs free plan gate), IDOR + unauthenticated SSE regressions,
# TTS read-aloud (replay is free), upload rejections, and the backend log lines
# that prove each branch ran.
#
# Usage:
#   export QA_ADMIN_EMAIL=<admin email> QA_ADMIN_PASSWORD='<admin password>'
#   bash qa/test-multimodal.sh
#
# Accounts — nothing secret is stored in this file:
#   QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD   required (creates users, assigns plans)
#   QA_FREE_EMAIL  / QA_FREE_PASSWORD    optional; else a throwaway free user is created
#   QA_PAID_EMAIL  / QA_PAID_PASSWORD    optional; else a throwaway user is created and
#                                        assigned QA_PAID_PLAN_SLUG (default "pro")
#   A created user gets a random password that is never printed or saved. A created
#   paid user is topped up with QA_PAID_TOPUP_MICRO_USD (default 2000000 = $2) through
#   the admin credit-adjust route so metered lanes (helper vision, STT, TTS) can reserve.
#
# Optional knobs:
#   QA_BASE (default https://claw.local/api/v1)
#   QA_NON_VISION_PROVIDER / QA_NON_VISION_MODEL   pin the "blind" chat model
#   QA_SPEECH_AUDIO=<host path>   real speech for the voice + video lanes (else the paid
#                                 TTS output is reused, else a sine tone — see SKIPs)
#   QA_FILE_CONTAINER (default claw-file-service) — where ffmpeg lives
#   QA_POLL_S (3), QA_INGEST_TIMEOUT_S (90), QA_CHAT_TIMEOUT_S (240),
#   QA_TRANSCRIBE_TIMEOUT_S (240), QA_VIDEO_TIMEOUT_S (300), QA_IMAGE_TIMEOUT_S (300)
#
# Every wait is bounded by a wall-clock deadline. Output: one PASS / FAIL / SKIP line
# per assertion, then counts. Exit code = number of FAILs (capped at 255).
# Runbook: skills/verify-multimodal-routing-live.md.

set -u

BASE="${QA_BASE:-https://claw.local/api/v1}"
POLL_S="${QA_POLL_S:-3}"
INGEST_TIMEOUT_S="${QA_INGEST_TIMEOUT_S:-90}"
CHAT_TIMEOUT_S="${QA_CHAT_TIMEOUT_S:-240}"
TRANSCRIBE_TIMEOUT_S="${QA_TRANSCRIBE_TIMEOUT_S:-240}"
VIDEO_TIMEOUT_S="${QA_VIDEO_TIMEOUT_S:-300}"
IMAGE_TIMEOUT_S="${QA_IMAGE_TIMEOUT_S:-300}"
FILE_CONTAINER="${QA_FILE_CONTAINER:-claw-file-service}"
PAID_PLAN_SLUG="${QA_PAID_PLAN_SLUG:-pro}"
PAID_TOPUP="${QA_PAID_TOPUP_MICRO_USD:-2000000}"

PASS=0
FAIL=0
SKIP=0
RUN_START_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# A genuine 1x1 PNG, so file-service's magic-byte check sees real image bytes.
PNG_B64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

# ─── helpers ────────────────────────────────────────────────────────────────

pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }
skip() { echo "SKIP: $1"; SKIP=$((SKIP + 1)); }
section() { printf '\n=== %s ===\n' "$1"; }
now() { date +%s; }

summary() {
  echo
  echo "═══════════════════════════════════════"
  echo "RESULTS: PASS=$PASS FAIL=$FAIL SKIP=$SKIP"
  echo "═══════════════════════════════════════"
  exit $((FAIL > 255 ? 255 : FAIL))
}

fatal() { fail "$1 — cannot continue"; summary; }

# poll <timeout_s> <command...>: re-runs the command until it succeeds or the
# wall-clock deadline passes. The only loop in this script that waits.
poll() {
  local limit="$1"
  shift
  local deadline=$(($(now) + limit))
  while :; do
    "$@" && return 0
    [ "$(now)" -ge "$deadline" ] && return 1
    sleep "$POLL_S"
  done
}

# api <METHOD> <path> <token|-> [json-body-file] → prints the HTTP code; body in $TMP/resp.
api() {
  local method="$1" path="$2" token="$3" body="${4:-}"
  local max_time="${API_MAX_TIME:-60}"
  local -a args=(-sk --max-time "$max_time" -o "$TMP/resp" -w '%{http_code}' -X "$method")
  [ "$token" != "-" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-H 'Content-Type: application/json' --data-binary "@$body")
  curl "${args[@]}" "$BASE$path" 2>/dev/null || echo "000"
}

# List routes answer either a bare array or {data|items: [...]}; `rows` reads both.
JQ_ROWS='def rows: if type == "array" then . else (.data // .items // []) end; '

json_body() { jq -n "$@" > "$TMP/body.json"; echo "$TMP/body.json"; }
resp() { jq -r "$1" "$TMP/resp" 2>/dev/null; }
is_2xx() { case "$1" in 2??) return 0 ;; *) return 1 ;; esac; }

# login <email> <password> → prints the access token (empty on failure).
login() {
  local code
  code="$(api POST /auth/login - "$(json_body --arg e "$1" --arg p "$2" '{email:$e,password:$p}')")"
  is_2xx "$code" && resp '.tokens.accessToken // empty'
}

user_id_of() { # <token>
  local code
  code="$(api GET /auth/me "$1")"
  is_2xx "$code" && resp '.id // .user.id // empty'
}

random_password() { printf 'Qa1!%sZz' "$(od -An -tx1 -N8 /dev/urandom | tr -d ' \n')"; }

# create_user <tag> → sets NEW_EMAIL / NEW_PASSWORD / NEW_ID (empty id on failure).
create_user() {
  local suffix
  suffix="$1$(date +%s)$RANDOM"
  NEW_EMAIL="qa-mm-${suffix}@claw.local"
  NEW_PASSWORD="$(random_password)"
  NEW_ID=""
  local code
  code="$(api POST /users "$ADMIN_TOKEN" "$(json_body --arg e "$NEW_EMAIL" --arg u "qamm${suffix}" \
    --arg p "$NEW_PASSWORD" '{email:$e,username:($u|.[0:32]),password:$p,firstName:"QA",lastName:"Multimodal",role:"USER"}')")"
  is_2xx "$code" && NEW_ID="$(resp '.id // .user.id // empty')"
  [ -n "$NEW_ID" ] || echo "  create user $1 → HTTP $code $(head -c 200 "$TMP/resp")"
}

plan_id_for_slug() {
  local code
  code="$(api GET /admin/plans "$ADMIN_TOKEN")"
  is_2xx "$code" && jq -r --arg s "$1" "$JQ_ROWS"'[rows[] | select(.slug == $s)][0].id // empty' "$TMP/resp"
}

# upload <token> <filename> <mime> <base64-file> → prints the file id; code in $TMP/upload.code.
upload() {
  local token="$1" name="$2" mime="$3" b64="$4" size
  size="$(base64 -d < "$b64" | wc -c | tr -d ' ')"
  jq -n --arg f "$name" --arg m "$mime" --argjson s "$size" --rawfile c "$b64" \
    '{filename:$f,mimeType:$m,sizeBytes:$s,content:($c|rtrimstr("\n"))}' > "$TMP/upload.json"
  API_MAX_TIME=120 api POST /files/upload "$token" "$TMP/upload.json" > "$TMP/upload.code"
  is_2xx "$(cat "$TMP/upload.code")" && resp '.id // empty'
}

file_json() { # <token> <id> → $TMP/file.json
  local code
  code="$(api GET "/files/$2" "$1")"
  is_2xx "$code" && cp "$TMP/resp" "$TMP/file.json"
}

file_ingested() { file_json "$1" "$2" && [ "$(jq -r '.ingestionStatus' "$TMP/file.json")" = "COMPLETED" ]; }

# A voice/video row keeps its "[Audio file: " / "[Video file: " placeholder until the job lands.
file_past_placeholder() {
  file_json "$1" "$2" || return 1
  jq -e --arg p "$3" '(.extractedText // "" | startswith($p) | not) or ((.extractionError // "") != "")' \
    "$TMP/file.json" > /dev/null
}

create_thread() { # <token> <routingMode> [provider] [model] → thread id
  local code
  code="$(api POST /chat-threads "$1" "$(json_body --arg r "$2" --arg p "${3:-}" --arg m "${4:-}" \
    '{title:"QA multimodal",routingMode:$r} + (if $p == "" then {} else {preferredProvider:$p,preferredModel:$m} end)')")"
  is_2xx "$code" && resp '.id // empty'
}

# send <token> <thread> <routingMode> <content> <fileIdsJson> [provider] [model] → HTTP code
send() {
  API_MAX_TIME="$CHAT_TIMEOUT_S" api POST /chat-messages "$1" "$(json_body --arg t "$2" --arg r "$3" \
    --arg c "$4" --argjson f "$5" --arg p "${6:-}" --arg m "${7:-}" \
    '{threadId:$t,routingMode:$r,content:$c} + (if ($f|length) > 0 then {fileIds:$f} else {} end)
     + (if $p == "" then {} else {provider:$p,model:$m} end)')"
}

# assistant_where <token> <thread> <jq-predicate> → newest ASSISTANT message matching, in $TMP/assistant.json
assistant_where() {
  local code
  code="$(api GET "/chat-messages/thread/$2?limit=20" "$1")"
  is_2xx "$code" || return 1
  jq -e "$JQ_ROWS[rows[] | select(.role == \"ASSISTANT\") | select($3)][0] // empty" \
    "$TMP/resp" > "$TMP/assistant.json" 2>/dev/null
}

HAS_DELIVERY='(.metadata.fileDelivery // [] | length) > 0'
HAS_ANSWER='((.content // "") | length) > 0 or ((.metadata.type // "") != "")'

delivery_mode() { # <fileId> → mode of that file on $TMP/assistant.json
  jq -r --arg f "$1" '[.metadata.fileDelivery[]? | select(.fileId == $f) | .mode][0] // "none"' "$TMP/assistant.json"
}

ledger_count() { # <token> <surface> <kind>
  local code
  code="$(api GET '/credit/me/ledger?limit=100' "$1")"
  if is_2xx "$code"; then
    jq -r --arg s "$2" --arg k "$3" '[.entries[]? | select(.surface == $s and .kind == $k)] | length' "$TMP/resp"
  else
    echo "-1"
  fi
}

HAS_DOCKER=0
docker ps > /dev/null 2>&1 && HAS_DOCKER=1
bounded() { if command -v timeout > /dev/null 2>&1; then timeout "$@"; else shift; "$@"; fi; }
dexec() { MSYS_NO_PATHCONV=1 bounded 120 docker exec "$@"; }

HAS_FFMPEG=0
if [ "$HAS_DOCKER" = 1 ] && dexec "$FILE_CONTAINER" ffmpeg -hide_banner -version > /dev/null 2>&1; then
  HAS_FFMPEG=1
fi

# ffmpeg_fixture <out-name> <ffmpeg args after -y...> → $TMP/<out-name>.b64 (runs inside file-service)
ffmpeg_fixture() {
  local out="$1"
  shift
  dexec "$FILE_CONTAINER" ffmpeg -hide_banner -loglevel error -y "$@" "/tmp/qa-mm-$out" > /dev/null 2>&1 &&
    dexec "$FILE_CONTAINER" sh -c "base64 -w0 /tmp/qa-mm-$out; rm -f /tmp/qa-mm-$out" > "$TMP/$out.b64" &&
    [ -s "$TMP/$out.b64" ]
}

service_logs() { # <chat|file> → logs since the run started
  [ "$HAS_DOCKER" = 1 ] || return 1
  if [ "$1" = chat ]; then
    local ids
    ids="$(docker ps -q --filter label=claw.service=chat-service)"
    [ -n "$ids" ] || return 1
    for c in $ids; do docker logs --since "$RUN_START_ISO" "$c" 2>&1; done
  else
    docker logs --since "$RUN_START_ISO" "$FILE_CONTAINER" 2>&1
  fi
}

# ─── 0. preflight + accounts ────────────────────────────────────────────────

section "PREFLIGHT"
for bin in curl base64 od; do
  command -v "$bin" > /dev/null 2>&1 || fatal "missing tool: $bin"
done
# `command -v jq` is not enough: the npm package named "jq" installs a broken shim.
jq -n 1 > /dev/null 2>&1 || fatal "jq missing or broken — install jqlang jq (winget install jqlang.jq)"
[ -n "${QA_ADMIN_EMAIL:-}" ] && [ -n "${QA_ADMIN_PASSWORD:-}" ] || fatal "QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD not set"
ADMIN_TOKEN="$(login "$QA_ADMIN_EMAIL" "$QA_ADMIN_PASSWORD")"
[ -n "$ADMIN_TOKEN" ] || fatal "admin login"
pass "admin login"
[ "$HAS_DOCKER" = 1 ] && echo "  docker: available" || echo "  docker: NOT available (log + ffmpeg lanes will SKIP)"
[ "$HAS_FFMPEG" = 1 ] && echo "  ffmpeg: present in $FILE_CONTAINER" || echo "  ffmpeg: NOT reachable in $FILE_CONTAINER"

section "ACCOUNTS"
PAID_CREATED=0
if [ -n "${QA_PAID_EMAIL:-}" ]; then
  PAID_TOKEN="$(login "$QA_PAID_EMAIL" "${QA_PAID_PASSWORD:-}")"
else
  create_user paid
  [ -n "$NEW_ID" ] || fatal "create paid user"
  PLAN_ID="$(plan_id_for_slug "$PAID_PLAN_SLUG")"
  [ -n "$PLAN_ID" ] || fatal "plan slug '$PAID_PLAN_SLUG' not found"
  code="$(api POST "/admin/plans/users/$NEW_ID/assign" "$ADMIN_TOKEN" "$(json_body --arg p "$PLAN_ID" \
    '{planId:$p,durationMonths:1,grantReason:"qa multimodal live lane"}')")"
  is_2xx "$code" || fatal "assign plan $PAID_PLAN_SLUG → HTTP $code $(head -c 200 "$TMP/resp")"
  PAID_TOKEN="$(login "$NEW_EMAIL" "$NEW_PASSWORD")"
  PAID_CREATED=1
  echo "  created paid user $NEW_EMAIL on plan $PAID_PLAN_SLUG"
fi
[ -n "${PAID_TOKEN:-}" ] || fatal "paid user login"
PAID_ID="$(user_id_of "$PAID_TOKEN")"
pass "paid user signed in (id ${PAID_ID:-unknown})"

if [ "$PAID_CREATED" = 1 ] && [ -n "$PAID_ID" ]; then
  code="$(api POST "/admin/credit/wallets/$PAID_ID/adjust" "$ADMIN_TOKEN" "$(json_body --argjson a "$PAID_TOPUP" \
    '{amountMicroUsd:$a,reason:"qa multimodal live lane top-up"}')")"
  is_2xx "$code" && pass "paid wallet topped up by $PAID_TOPUP µUSD" ||
    fail "paid wallet top-up → HTTP $code $(head -c 200 "$TMP/resp")"
fi

if [ -n "${QA_FREE_EMAIL:-}" ]; then
  FREE_TOKEN="$(login "$QA_FREE_EMAIL" "${QA_FREE_PASSWORD:-}")"
else
  create_user free
  [ -n "$NEW_ID" ] || fatal "create free user"
  FREE_TOKEN="$(login "$NEW_EMAIL" "$NEW_PASSWORD")"
  echo "  created free user $NEW_EMAIL (default plan)"
fi
[ -n "${FREE_TOKEN:-}" ] || fatal "free user login"
pass "free user signed in"

# ─── 1. pick a chat model that cannot see ───────────────────────────────────

section "MODEL SELECTION"
NV_PROVIDER="${QA_NON_VISION_PROVIDER:-}"
NV_MODEL="${QA_NON_VISION_MODEL:-}"
if [ -z "$NV_MODEL" ]; then
  code="$(api GET /connectors/available-models "$PAID_TOKEN")"
  if is_2xx "$code"; then
    pick="$(jq -r "$JQ_ROWS"'[rows[] | select((.kind // "CHAT") == "CHAT" and .supportsVision != true
      and (.lifecycle // "ACTIVE") == "ACTIVE")]
      | (map(select(.provider == "OLLAMA" or .provider == "LLAMACPP")) + .)[0]
      | if . == null then empty else "\(.provider) \(.modelKey)" end' "$TMP/resp")"
    NV_PROVIDER="${pick%% *}"
    NV_MODEL="${pick#* }"
  fi
fi
if [ -n "$NV_MODEL" ]; then
  pass "non-vision chat model: $NV_PROVIDER/$NV_MODEL"
else
  skip "no non-vision chat model in available-models (set QA_NON_VISION_PROVIDER/MODEL)"
fi

# ─── 2. image → ingestion → blind model (helper vs honest note) ─────────────

section "IMAGE UNDERSTANDING ON A NON-VISION MODEL"
printf '%s' "$PNG_B64" > "$TMP/png.b64"
declare -A IMG_ID ASSIST_ID
for who in paid free; do
  token_var="${who^^}_TOKEN"
  token="${!token_var}"
  id="$(upload "$token" "qa-mm-$who.png" image/png "$TMP/png.b64")"
  if [ -z "$id" ]; then
    fail "$who image upload → HTTP $(cat "$TMP/upload.code") $(head -c 200 "$TMP/resp")"
    continue
  fi
  IMG_ID[$who]="$id"
  if poll "$INGEST_TIMEOUT_S" file_ingested "$token" "$id"; then
    pass "$who image ingestion COMPLETED ($id)"
  else
    fail "$who image not COMPLETED within ${INGEST_TIMEOUT_S}s (status $(jq -r '.ingestionStatus' "$TMP/file.json" 2>/dev/null))"
    continue
  fi
  [ -n "$NV_MODEL" ] || { skip "$who image chat (no non-vision model)"; continue; }
  thread="$(create_thread "$token" MANUAL_MODEL "$NV_PROVIDER" "$NV_MODEL")"
  [ -n "$thread" ] || { fail "$who create thread"; continue; }
  code="$(send "$token" "$thread" MANUAL_MODEL "Describe the attached image in one short sentence." \
    "[\"$id\"]" "$NV_PROVIDER" "$NV_MODEL")"
  is_2xx "$code" || { fail "$who image chat send → HTTP $code $(head -c 200 "$TMP/resp")"; continue; }
  if poll "$CHAT_TIMEOUT_S" assistant_where "$token" "$thread" "$HAS_DELIVERY"; then
    ASSIST_ID[$who]="$(jq -r '.id' "$TMP/assistant.json")"
    mode="$(delivery_mode "$id")"
    expected=OMITTED_NO_VISION
    [ "$who" = paid ] && expected=DERIVED_IMAGE_TEXT
    [ "$mode" = "$expected" ] && pass "$who fileDelivery = $mode" ||
      fail "$who fileDelivery expected $expected, got $mode (reason $(jq -r --arg f "$id" \
        '[.metadata.fileDelivery[]? | select(.fileId == $f) | .reason][0] // "none"' "$TMP/assistant.json"))"
  else
    fail "$who assistant reply with fileDelivery not seen within ${CHAT_TIMEOUT_S}s"
  fi
done

# ─── 3. TTS read-aloud ──────────────────────────────────────────────────────

section "TEXT TO SPEECH"
TTS_FILE=""
TTS_MIME=""
code="$(api GET /chat-messages/speech/availability "$PAID_TOKEN")"
if is_2xx "$code" && [ "$(resp '.available')" = "true" ]; then
  pass "paid speech availability = available"
  if [ -n "${ASSIST_ID[paid]:-}" ]; then
    # Progressive read aloud (2026-09-25): POST answers 202 GENERATING (or 200
    # READY) at once; poll GET until a final state. Bounded: 120 x 2 s.
    code="$(api POST "/chat-messages/${ASSIST_ID[paid]}/speech" "$PAID_TOKEN")"
    tts_status="$(resp '.status // empty')"
    for _ in $(seq 1 120); do
      case "$tts_status" in READY | PARTIAL | FAILED) break ;; esac
      sleep 2
      code="$(api GET "/chat-messages/${ASSIST_ID[paid]}/speech" "$PAID_TOKEN")"
      tts_status="$(resp '.status // empty')"
    done
    if is_2xx "$code" && [ "$tts_status" = "READY" ] && [ -n "$(resp '.segments[0].fileId // empty')" ]; then
      TTS_FILE="$(resp '.segments[0].fileId')"
      TTS_MIME="$(resp '.segments[0].mimeType')"
      pass "paid read-aloud → READY, $(resp '.segments | length')/$(resp '.totalSegments') segments, first $TTS_FILE ($TTS_MIME)"
      before="$(ledger_count "$PAID_TOKEN" TTS CONSUMPTION)"
      code="$(api POST "/chat-messages/${ASSIST_ID[paid]}/speech" "$PAID_TOKEN")"
      [ "$code" = 200 ] && [ "$(resp '.status')" = "READY" ] && [ "$(resp '.segments[0].fileId')" = "$TTS_FILE" ] &&
        pass "second read-aloud replays READY with the same first segment (HTTP 200)" ||
        fail "second read-aloud → HTTP $code status $(resp '.status') fileId $(resp '.segments[0].fileId')"
      after="$(ledger_count "$PAID_TOKEN" TTS CONSUMPTION)"
      [ "$before" != "-1" ] && [ "$before" = "$after" ] &&
        pass "replay added no TTS CONSUMPTION row ($before → $after)" ||
        fail "TTS CONSUMPTION rows around the replay: $before → $after"
    else
      fail "paid read-aloud → HTTP $code status ${tts_status:-none} $(head -c 200 "$TMP/resp")"
    fi
  else
    skip "paid read-aloud (no paid assistant message from the image lane)"
  fi
else
  skip "TTS lanes: availability HTTP $code reason $(resp '.reason // empty') — no TTS_VOICE provider configured"
fi
code="$(api GET /chat-messages/speech/availability "$FREE_TOKEN")"
echo "  free speech availability: HTTP $code $(head -c 120 "$TMP/resp")"
if [ -n "${ASSIST_ID[free]:-}" ]; then
  code="$(api POST "/chat-messages/${ASSIST_ID[free]}/speech" "$FREE_TOKEN")"
  [ "$code" = 403 ] && pass "free read-aloud → 403 $(resp '.code // .errorCode // empty')" ||
    fail "free read-aloud expected 403, got $code $(head -c 160 "$TMP/resp")"
else
  skip "free read-aloud (no free assistant message from the image lane)"
fi

# ─── 4. speech fixture ──────────────────────────────────────────────────────

section "FIXTURES"
SPEECH_SRC=none
if [ -n "${QA_SPEECH_AUDIO:-}" ] && [ -f "$QA_SPEECH_AUDIO" ]; then
  cp "$QA_SPEECH_AUDIO" "$TMP/speech.bin" && SPEECH_SRC=env
elif [ -n "$TTS_FILE" ]; then
  curl -sk --max-time 60 -H "Authorization: Bearer $PAID_TOKEN" -o "$TMP/speech.bin" \
    "$BASE/files/download/$TTS_FILE" && [ -s "$TMP/speech.bin" ] && SPEECH_SRC=tts
fi
if [ "$HAS_FFMPEG" = 1 ] && [ "$SPEECH_SRC" != none ]; then
  MSYS_NO_PATHCONV=1 bounded 60 docker exec -i "$FILE_CONTAINER" sh -c 'cat > /tmp/qa-mm-src.bin' < "$TMP/speech.bin" ||
    SPEECH_SRC=none
fi
echo "  speech source: $SPEECH_SRC"

VOICE_MIME=audio/mpeg
if [ "$HAS_FFMPEG" = 1 ]; then
  if [ "$SPEECH_SRC" != none ]; then
    ffmpeg_fixture voice.mp3 -i /tmp/qa-mm-src.bin -t 6 -ac 1 -ar 16000 -c:a libmp3lame
  else
    ffmpeg_fixture voice.mp3 -f lavfi -i sine=frequency=440:duration=3 -c:a libmp3lame
  fi || rm -f "$TMP/voice.mp3.b64"
  AUDIO_IN=(-f lavfi -i sine=frequency=440:duration=4)
  [ "$SPEECH_SRC" != none ] && AUDIO_IN=(-i /tmp/qa-mm-src.bin)
  ffmpeg_fixture video.mp4 -f lavfi -i testsrc=duration=4:size=320x240:rate=10 "${AUDIO_IN[@]}" \
    -t 4 -c:v mpeg4 -c:a aac -movflags +faststart || rm -f "$TMP/video.mp4.b64"
elif [ "$SPEECH_SRC" != none ]; then
  base64 < "$TMP/speech.bin" | tr -d '\n' > "$TMP/voice.mp3.b64"
  VOICE_MIME="${TTS_MIME:-audio/mpeg}"
fi
[ -s "$TMP/voice.mp3.b64" ] && pass "voice fixture built ($SPEECH_SRC)" || skip "voice fixture (no ffmpeg in $FILE_CONTAINER and no speech bytes)"
[ -s "$TMP/video.mp4.b64" ] && pass "video fixture built (4 s, $SPEECH_SRC audio)" || skip "video fixture (ffmpeg not reachable in $FILE_CONTAINER)"

# ─── 5. voice → metered transcription ───────────────────────────────────────

section "VOICE NOTE TRANSCRIPTION"
VOICE_ID=""
if [ -s "$TMP/voice.mp3.b64" ]; then
  res_before="$(ledger_count "$PAID_TOKEN" TRANSCRIPTION RESERVATION)"
  con_before="$(ledger_count "$PAID_TOKEN" TRANSCRIPTION CONSUMPTION)"
  VOICE_ID="$(upload "$PAID_TOKEN" qa-mm-voice.mp3 "$VOICE_MIME" "$TMP/voice.mp3.b64")"
  if [ -n "$VOICE_ID" ]; then
    pass "voice upload accepted ($VOICE_ID)"
    if poll "$TRANSCRIBE_TIMEOUT_S" file_past_placeholder "$PAID_TOKEN" "$VOICE_ID" '[Audio file: '; then
      err="$(jq -r '.extractionError // empty' "$TMP/file.json")"
      [ -z "$err" ] && pass "transcription completed: \"$(jq -r '.extractedText' "$TMP/file.json" | head -c 80)\"" ||
        fail "transcription failed: $err"
    else
      fail "transcription still pending after ${TRANSCRIBE_TIMEOUT_S}s"
    fi
    res_after="$(ledger_count "$PAID_TOKEN" TRANSCRIPTION RESERVATION)"
    con_after="$(ledger_count "$PAID_TOKEN" TRANSCRIPTION CONSUMPTION)"
    metered="$(service_logs file | grep "reserve: held fileId=$VOICE_ID " | grep -o 'metered=[a-z]*' | tail -1)"
    if [ "$metered" = "metered=false" ]; then
      skip "transcription ledger: provider is PAYG-exempt (log says $metered)"
    elif [ "$res_after" -gt "$res_before" ] && [ "$con_after" -gt "$con_before" ]; then
      pass "ledger TRANSCRIPTION RESERVATION $res_before→$res_after, CONSUMPTION $con_before→$con_after"
    else
      fail "ledger TRANSCRIPTION RESERVATION $res_before→$res_after, CONSUMPTION $con_before→$con_after (${metered:-no reserve log})"
    fi
  else
    fail "voice upload → HTTP $(cat "$TMP/upload.code") $(head -c 200 "$TMP/resp")"
  fi
else
  skip "voice transcription lane (no voice fixture)"
fi

# ─── 6. video → ffmpeg job → timestamps → frames stay internal → chat ──────

section "VIDEO"
VIDEO_ID=""
if [ -s "$TMP/video.mp4.b64" ]; then
  VIDEO_ID="$(upload "$PAID_TOKEN" qa-mm-video.mp4 video/mp4 "$TMP/video.mp4.b64")"
  [ -n "$VIDEO_ID" ] && pass "video upload accepted ($VIDEO_ID)" ||
    fail "video upload → HTTP $(cat "$TMP/upload.code") $(head -c 200 "$TMP/resp")"
fi
if [ -n "$VIDEO_ID" ]; then
  if poll "$VIDEO_TIMEOUT_S" file_past_placeholder "$PAID_TOKEN" "$VIDEO_ID" '[Video file: '; then
    jq -e '.ingestionStatus == "COMPLETED" and (.extractionMetadata.media.durationMs // 0) > 0' "$TMP/file.json" > /dev/null &&
      pass "FILE_VIDEO_PROCESS completed (durationMs $(jq -r '.extractionMetadata.media.durationMs' "$TMP/file.json"))" ||
      fail "video job ended without media metadata: $(jq -r '.extractionError // .ingestionStatus' "$TMP/file.json")"
    if [ "$SPEECH_SRC" = none ]; then
      skip "video transcript timestamps (tone fixture has no words; set QA_SPEECH_AUDIO)"
    elif jq -r '.extractedText // ""' "$TMP/file.json" | grep -q '\[00:'; then
      pass "video extractedText carries [00: timestamps"
    else
      fail "video extractedText has no [00: timestamp: $(jq -r '.extractedText' "$TMP/file.json" | head -c 160)"
    fi
  else
    fail "video still processing after ${VIDEO_TIMEOUT_S}s"
  fi

  for path in "/internal/files/$VIDEO_ID/video-frames" "/files/$VIDEO_ID/video-frames"; do
    code="$(api POST "$path" "$PAID_TOKEN" "$(json_body --arg u "${PAID_ID:-x}" '{userId:$u,timestampsMs:[1000]}')")"
    case "$code" in
      401 | 403 | 404 | 405) grep -q '"frames"' "$TMP/resp" && fail "$path leaked frames" || pass "frames not reachable via nginx: $path → $code" ;;
      *) fail "frames route via nginx $path → $code (expected 401/403/404/405)" ;;
    esac
  done

  thread="$(create_thread "$PAID_TOKEN" AUTO)"
  code="$(send "$PAID_TOKEN" "$thread" AUTO "What happens at 0:02 in this video?" "[\"$VIDEO_ID\"]")"
  if is_2xx "$code" && poll "$CHAT_TIMEOUT_S" assistant_where "$PAID_TOKEN" "$thread" "$HAS_DELIVERY"; then
    mode="$(delivery_mode "$VIDEO_ID")"
    case "$mode" in
      VIDEO_FRAMES_AND_TRANSCRIPT | NATIVE_VIDEO) pass "video chat fileDelivery = $mode ($(jq -r '.metadata.provider // .provider // "?"' "$TMP/assistant.json"))" ;;
      *) fail "video chat fileDelivery = $mode (expected VIDEO_FRAMES_AND_TRANSCRIPT or NATIVE_VIDEO)" ;;
    esac
  else
    fail "video chat: send HTTP $code, no assistant reply with fileDelivery within ${CHAT_TIMEOUT_S}s"
  fi
else
  skip "video processing / frames / video chat lanes (no video uploaded)"
fi

# ─── 7. image generation from chat: paid vs free ────────────────────────────

section "IMAGE GENERATION FROM CHAT"
GEN_ID=""
GEN_PROMPT="Generate an image of a red apple on a white table."
image_settled() {
  local code
  code="$(api GET "/images/$1" "$PAID_TOKEN")"
  is_2xx "$code" || return 1
  cp "$TMP/resp" "$TMP/image.json"
  case "$(jq -r '.latest.status // .status' "$TMP/image.json")" in
    COMPLETED | FAILED | TIMED_OUT | CANCELLED) return 0 ;;
    *) return 1 ;;
  esac
}
thread="$(create_thread "$PAID_TOKEN" AUTO)"
code="$(send "$PAID_TOKEN" "$thread" AUTO "$GEN_PROMPT" '[]')"
if is_2xx "$code" && poll "$CHAT_TIMEOUT_S" assistant_where "$PAID_TOKEN" "$thread" "$HAS_ANSWER"; then
  GEN_ID="$(jq -r 'select(.metadata.type == "image_generation") | .metadata.generationId // empty' "$TMP/assistant.json")"
  if [ -n "$GEN_ID" ]; then
    pass "paid chat started image generation $GEN_ID"
    if poll "$IMAGE_TIMEOUT_S" image_settled "$GEN_ID"; then
      status="$(jq -r '.latest.status // .status' "$TMP/image.json")"
      [ "$status" = COMPLETED ] && pass "image generation COMPLETED ($(jq -r '.provider' "$TMP/image.json")/$(jq -r '.model' "$TMP/image.json"))" ||
        fail "image generation ended $status: $(jq -r '.errorCode // empty' "$TMP/image.json")"
    else
      fail "image generation not settled within ${IMAGE_TIMEOUT_S}s"
    fi
  else
    fail "paid chat reply is not an image generation (metadata.type=$(jq -r '.metadata.type // "none"' "$TMP/assistant.json"))"
  fi
else
  fail "paid image-generation turn: send HTTP $code, no reply within ${CHAT_TIMEOUT_S}s"
fi

thread="$(create_thread "$FREE_TOKEN" AUTO)"
code="$(send "$FREE_TOKEN" "$thread" AUTO "$GEN_PROMPT" '[]')"
if is_2xx "$code" && poll "$CHAT_TIMEOUT_S" assistant_where "$FREE_TOKEN" "$thread" "$HAS_ANSWER"; then
  jq -e '.metadata.type == "plan_feature_disabled" and .metadata.planFeature == "allowImageGeneration"' \
    "$TMP/assistant.json" > /dev/null &&
    pass "free image request → plan_feature_disabled notice (allowImageGeneration)" ||
    fail "free image request metadata = $(jq -c '.metadata' "$TMP/assistant.json" | head -c 200)"
else
  fail "free image-generation turn: send HTTP $code, no reply within ${CHAT_TIMEOUT_S}s"
fi

# ─── 8. IDOR + unauthenticated SSE regressions (batch 1) ────────────────────

section "IDOR AND SSE"
if [ -n "$GEN_ID" ]; then
  for route in "POST /images/$GEN_ID/retry" "POST /images/$GEN_ID/retry-alternate" "GET /images/$GEN_ID"; do
    code="$(api ${route%% *} "${route#* }" "$FREE_TOKEN")"
    [ "$code" = 404 ] && pass "non-owner $route → 404" || fail "non-owner $route → $code (expected 404)"
  done
else
  skip "image IDOR (no paid generation id)"
fi
code="$(API_MAX_TIME=10 api GET "/images/${GEN_ID:-qa-nonexistent}/events" -)"
[ "$code" = 401 ] && pass "image SSE without auth → 401" || fail "image SSE without auth → $code (expected 401)"
code="$(API_MAX_TIME=10 api GET "/chat-messages/stream/${thread:-qa-nonexistent}" -)"
[ "$code" = 401 ] && pass "chat SSE without auth → 401" || fail "chat SSE without auth → $code (expected 401)"

# ─── 9. upload rejections ───────────────────────────────────────────────────

section "UPLOAD REJECTIONS"
printf 'this is plain text pretending to be a video\n' | base64 | tr -d '\n' > "$TMP/fake.b64"
id="$(upload "$PAID_TOKEN" qa-mm-fake.mp4 video/mp4 "$TMP/fake.b64")"
code="$(cat "$TMP/upload.code")"
[ -z "$id" ] && case "$code" in 400 | 415 | 422) true ;; *) false ;; esac &&
  pass "text renamed .mp4 rejected → $code $(resp '.code // .errorCode // empty')" ||
  fail "text renamed .mp4 → $code (id ${id:-none})"
code="$(api POST /files/upload "$PAID_TOKEN" "$(json_body --arg c "$PNG_B64" \
  '{filename:"qa-mm-huge.png",mimeType:"image/png",sizeBytes:52428801,content:$c}')")"
case "$code" in
  400 | 413 | 422) pass "oversized upload (50 MB + 1 declared) rejected → $code" ;;
  *) fail "oversized upload → $code (expected 400/413/422)" ;;
esac

# ─── 10. log lines prove which branch ran ───────────────────────────────────

section "LOG LINES"
if CHAT_LOGS="$(service_logs chat)"; then
  for prefix in mediaDelivery visionHelper videoDelivery; do
    n="$(printf '%s\n' "$CHAT_LOGS" | grep -c "$prefix {")"
    if [ "$n" -gt 0 ]; then
      pass "chat-service logged '$prefix' ($n lines)"
    elif [ "$prefix" = videoDelivery ] && [ -z "$VIDEO_ID" ]; then
      skip "chat-service '$prefix' (video lane did not run)"
    elif [ "$prefix" = videoDelivery ] && printf '%s\n' "$CHAT_LOGS" | grep -q 'NATIVE_VIDEO'; then
      skip "chat-service '$prefix' (AUTO chose a native-video model)"
    else
      fail "chat-service has no '$prefix {' line since $RUN_START_ISO"
    fi
  done
else
  skip "chat-service log lines (docker or chat-service container not reachable)"
fi
if FILE_LOGS="$(service_logs file)"; then
  if [ -n "$VOICE_ID" ]; then
    printf '%s\n' "$FILE_LOGS" | grep -q "reserve: held fileId=$VOICE_ID .*surface=TRANSCRIPTION" &&
      pass "file-service 'reserve: held … surface=TRANSCRIPTION' for the voice note" ||
      fail "no 'reserve: held fileId=$VOICE_ID … surface=TRANSCRIPTION' line"
    printf '%s\n' "$FILE_LOGS" | grep -q "finalize: requestId=transcription:$VOICE_ID:.*outcome=FINALIZED" &&
      pass "file-service 'finalize: … outcome=FINALIZED' for the voice note" ||
      fail "no 'finalize: requestId=transcription:$VOICE_ID:… outcome=FINALIZED' line"
  else
    skip "transcription reserve/finalize lines (voice lane did not run)"
  fi
  if [ -n "$VIDEO_ID" ]; then
    printf '%s\n' "$FILE_LOGS" | grep -q "videoProcessed: fileId=$VIDEO_ID " &&
      pass "file-service 'videoProcessed: fileId=$VIDEO_ID'" ||
      fail "no 'videoProcessed: fileId=$VIDEO_ID' line ($(printf '%s\n' "$FILE_LOGS" | grep "videoFailed: fileId=$VIDEO_ID" | head -1))"
  else
    skip "videoProcessed line (video lane did not run)"
  fi
else
  skip "file-service log lines (docker or $FILE_CONTAINER not reachable)"
fi

summary
