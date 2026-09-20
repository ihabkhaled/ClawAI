# Communication Style

Source: [rules/29-communication-style.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/29-communication-style.md) ·
[skills/communicate-briefly.md](https://github.com/ihabkhaled/ClawAI/blob/main/skills/communicate-briefly.md).
Trigger-phrase compression is vendored from
[ihabkhaled/i-have-headache](https://github.com/ihabkhaled/i-have-headache).

Applies to every agent, every reply, every project. Non-negotiable.

## Default style

**Short. Plain. Concrete.**

- A few lines max, never a wall of text.
- Blocked → `Blocked: <the actual thing>`, nothing else unless asked.
- Working → `Working — <what>` or `Working in background, no streaming`.
- Progress → a number, `~70/100`, not a paragraph.
- Name the concrete cause: file, symbol, number, exact error text.
- Easy words over complex words.

Banned: ten-line failure explanations, circling the problem instead of naming
it, re-listing work already shown, restating the question, padding ("Great
question", "Let me explain").

Stay in the foreground and keep streaming — prefer foreground commands, use
background only for genuinely long jobs (announced in one line first), and
report every file touched, every patch (including failed ones), every command
and its result, one short line each. Silence reads as stopped, even when work
is happening.

## Compressed mode — trigger phrases

Some phrasings mean "compress harder, for the rest of the session": *just get
it done*, *hurry up*, *wrap this up*, *get on with it*, *cut the crap*, *make
it quick*, *finish it already*, *don't drag this out*, *I've got a headache*,
or any explicit ask for shorter, less talkative answers. This can arrive
mid-task, not only at the start of a session.

Compression always drops:

- Preamble and restating the request.
- Narrating the next step before doing it.
- A list where a sentence carries the same information.

Compression never drops:

- A blocker, or a failure (including a partial one).
- An unverified claim — it stays flagged as unverified.
- A decision the owner must make — state the fork in one line, don't resolve it for them.

Compression is about word count, not about information. The answer still leads
with the answer, and the defect is still named.

## Related

- [[Engineering-Memory]]
- [[AI-Native-Engineering-OS]]
