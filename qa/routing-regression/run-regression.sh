#!/usr/bin/env bash
# Phase 10 regression runner — diffs every prompt in prompts/*.jsonl
# against POST /api/v1/routing/evaluate. Exit 0 on full pass, 1 on
# any miss. Designed to run unattended in CI once enough prompts exist.

set -u
cd "$(dirname "$0")"

: "${BASE_URL:=http://localhost:4000}"
: "${ADMIN_TOKEN:?ADMIN_TOKEN must be set — run ./qa/auth-login.sh first}"

mkdir -p results
ts="$(date -u +%Y%m%d-%H%M%S)"
out="results/${ts}.jsonl"
pass=0
fail=0
miss=()

for jsonl in prompts/*.jsonl; do
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    id="$(echo "$line" | jq -r '.id')"
    prompt="$(echo "$line" | jq -r '.prompt')"
    expectedCat="$(echo "$line" | jq -r '.expect.detectedCategory // empty')"
    expectedWf="$(echo "$line" | jq -r '.expect.selectedWorkflow // empty')"
    expectedJudge="$(echo "$line" | jq -r '.expect.judgeEnabled // empty')"
    mustLocal="$(echo "$line" | jq -r '.expect.mustBeLocal // empty')"

    body="$(jq -n --arg msg "$prompt" '{messageContent:$msg, routingMode:"AUTO"}')"
    resp="$(curl -sk -X POST "$BASE_URL/api/v1/routing/evaluate" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body")"

    actualCat="$(echo "$resp" | jq -r '.detectedCategory // empty')"
    actualWf="$(echo "$resp" | jq -r '.selectedWorkflow // empty')"
    actualJudge="$(echo "$resp" | jq -r '.judgeEnabled // empty')"
    actualProv="$(echo "$resp" | jq -r '.selectedProvider // empty')"

    ok=1
    reasons=()
    if [[ -n "$expectedCat" && "$expectedCat" != "$actualCat" ]]; then
      ok=0; reasons+=("category $actualCat != $expectedCat")
    fi
    if [[ -n "$expectedWf" && "$expectedWf" != "$actualWf" ]]; then
      ok=0; reasons+=("workflow $actualWf != $expectedWf")
    fi
    if [[ -n "$expectedJudge" && "$expectedJudge" != "$actualJudge" ]]; then
      ok=0; reasons+=("judgeEnabled $actualJudge != $expectedJudge")
    fi
    if [[ "$mustLocal" == "true" ]]; then
      case "$actualProv" in
        OPENAI|ANTHROPIC|GEMINI|GROK|DEEPSEEK|AWS_BEDROCK)
          ok=0; reasons+=("privacy leak to cloud provider $actualProv");;
      esac
    fi

    if [[ "$ok" -eq 1 ]]; then
      pass=$((pass+1))
      echo "PASS $id"
    else
      fail=$((fail+1))
      miss+=("$id: ${reasons[*]}")
      echo "FAIL $id — ${reasons[*]}"
    fi

    echo "$line" | jq --arg actualCat "$actualCat" --arg actualWf "$actualWf" \
      --arg actualJudge "$actualJudge" --arg actualProv "$actualProv" --arg ok "$ok" \
      '. + {actual:{detectedCategory:$actualCat, selectedWorkflow:$actualWf, judgeEnabled:$actualJudge, selectedProvider:$actualProv}, pass:($ok=="1")}' >> "$out"
  done < "$jsonl"
done

echo
echo "===== Summary ====="
echo "PASS: $pass"
echo "FAIL: $fail"
echo "Results: $out"
if [[ "$fail" -gt 0 ]]; then
  echo
  echo "Misses:"
  printf '  - %s\n' "${miss[@]}"
  exit 1
fi
