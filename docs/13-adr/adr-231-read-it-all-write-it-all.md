# ADR-231: Read it all, write it all

Status: Accepted (2026-11-28) · Owner order: "the harness itself must accept this huge context … if AI cannot handle
this huge context, let's assume it is a million and the model is 512 only, so split it, do multiple sends until AI can
analyze it completely based on model context max cap … and output even millions of characters."

## Context

The owner attached a 42,417-byte research brief (about 27,800 characters of Arabic). On a small-window model the
answer showed "Truncated — the file was larger than the model's window, so its opening and the parts most relevant
to your question were sent". Three limits caused it:

1. **Chat input.** A file larger than its share of the answering model's window was fitted by relevance (ADR-219):
   the opening plus the passages that matched the question. Everything else never reached any model.
2. **Chat output.** An answer cut by the model's output limit (`finish_reason` length) was stored as it was.
3. **Threads.** The topic box refused more than 10,000 characters in three services, and Express refused bodies over
   100 KB before validation; a long topic went whole into one planner prompt.

Many catalogued models have tiny windows (2,048 to 6,144 tokens locally), so this is common, not an edge case.

## Decision

1. **The window fit keeps the whole text aside.** `ContextAssemblyManager.fitFixedContext` records every file it had to
   cut as `AssembledContext.oversizedFiles` (id, name, whole text). Nothing else changes for files that fit.
2. **Read in parts** (`LongInputReaderManager`, before the answer call). Parts are sized to the answering model's own
   window and split on a paragraph, line or sentence boundary; at most 400 parts (evenly sampled above that, and the
   notes say so), 3 in parallel; each part is one metered `callProvider` call with only the instruction as context; a
   part that fails stays as a visible gap line. The work log shows "Reading all N parts of X" and "Read all N parts".
3. **Two ways to use the parts, decided by a model** (one judge call through the planner chain, any language, rule 67):
   - _notes_: a question, summary or analysis. Each part yields complete notes (headings, instructions and closing lines
     word for word); notes that still do not fit are merged again (at most 3 levels); the notes replace the file's text
     and the model answers as usual. Parts are half the window.
   - _each part_: translate, rewrite, convert, correct, copy every line. The request is carried out on every part and
     the results, joined in document order, ARE the answer, streamed as they complete in order. Parts are a quarter of
     the window (the result needs room), and a part cut by the output limit is continued until it ends (at most 6).
4. **Write it all.** `LongOutputManager` continues any answer cut by the output limit: the partial answer goes back as
   the model's turn with "continue exactly where you stopped", up to 20 times, joined into one stored answer that keeps
   streaming. A Stop ends it.
5. **Threads** accept topics up to 1,000,000 characters (threads-service, thread-generation-service, frontend; JSON
   body limits raised to 8 MB and 16 MB). thread-generation-service reads a topic longer than half the smallest window
   among its models in parts (one cheap metered call each, at most 400, 3 at once, checkpointed, a gap line on
   failure); later stages get the first 2,000 characters plus the notes. Step code `TOPIC_READING {done,total}`.

## Consequences

- Measured locally on the owner's file with `openai/gpt-3.5-turbo-0613` (4,095 tokens): a question read all 5 parts and
  listed all 16 sections including the last instruction; "translate the whole document" read 10 parts and returned
  20,513 characters ending with the file's real last line (before: 3,327 characters, cut).
- Cost grows with size: one call per part (and per continuation). Every call is metered at the usual chokepoint.
- A pasted text over 20,000 characters already becomes a `.txt` attachment (ADR-219), so it takes this path; a typed
  message is still capped at 100,000 characters.
- Not yet: Compare, Consensus, Escalation and the labs still answer from the fitted cut (rule 59 gap); the each-part
  answer stores no per-part citations; the judge reads only the request.
