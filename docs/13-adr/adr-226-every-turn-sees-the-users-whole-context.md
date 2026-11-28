# ADR-226: Every turn sees the user's whole context, in any language

Status: Accepted (2026-11-28) · Owner order after two production reports.

## Context

Two reports on 2026-11-28:

1. **Search ignored the chat.** A lyric lookup failed for six turns. "Search with the lyrics I wrote above" searched
   for the words "above-mentioned", because the research planner and the harness council saw only the current
   message. A bare lyric line was answered from memory with invented singers. When Google's results did contain the
   line under its song and band, the model said no source mentioned it, because the spelling differed by a few letters.
2. **A saved secret was invisible.** Saved from one chat, it was not found from a new one until the user said "it is in
   your memory".

The causes were five independent filters, all silent:

- memory-service returned the top **5** memories (from 15 candidates);
- the AUTO fast path kept the first **2** of them;
- chat-service then dropped every fact whose words did not overlap the question by 28%;
- four word matchers (memory selection, memory-service scoring, older-turn recall, cross-chat search) kept only
  `[a-z0-9]`, so **every non-Latin word was deleted**: Arabic memories never matched, and other chats were searched
  for nothing;
- cross-chat search needed three such words, and several cloud providers without a catalogued window got an 8k budget.

## Decision

1. **Memory is never filtered by relevance.** Every memory the user saved (up to 50) reaches every turn in which
   memory is on; relevance only orders them, and only the window fit may shorten the text. The memory block says what
   it is: the user's own information, including secrets they chose to store, to use when it helps.
2. **One word matcher for every language** (`context-tokens.utility.ts`, mirrored in memory-service): Unicode words,
   Arabic marks and letter forms folded and the article dropped, Chinese, Japanese and Thai by character pairs,
   stop words for short non-Latin words. Database searches use unfolded words, because stored text keeps its forms.
3. **The fast path trims workspace citations only**, never conversation and never memory.
4. **Cross-chat search** needs two meaningful words; large cloud providers without a catalogued window get the
   provider default, not 8k.
5. **Research plans from the whole chat.** The planner and every council member read up to 60 earlier turns (16,000
   characters, newest first, the first message always kept) and the user's saved memories, fenced as data. Every query
   must be self-contained. Explicit research modes get a self-contained query from the same plan.
6. **Text lookups search the exact words.** The council names `exactText` (lyrics, a quote, an error message): it is the
   primary query (so the strongest provider gets it), the quoted phrase is next, video and social sources come first,
   and a miss gets another round. Identifying lyrics or a quote always researches.
7. **A near-identical line is a match.** The grounding instructions say spelling, dialect and typo differences are the
   same text; hashtags, titles and captions are evidence.
8. **The primary query ranks highest** in result fusion (weight 2); platform API rows weigh 0.6.

## Consequences

- Measured locally after the change: the owner's six-turn lyric chat names the song and band on **every** turn,
  with linked citations, from the first bare line. A secret saved before eight other memories was found from new chats
  in English and Egyptian Arabic; a cat's name said only in another Arabic chat was recalled; a budget and a place
  survived a "تمام" turn.
- Prompts carry more memory and history. Memories are short; the window fit still protects the model's window.
- Planning calls are larger (up to ~19,000 characters of context); the same models and timeouts handle it.
- Remaining limits: Compare, Consensus, Escalation and the labs still plan research from markers (rule 59 known gap);
  cross-chat recall is word-based, not semantic.
