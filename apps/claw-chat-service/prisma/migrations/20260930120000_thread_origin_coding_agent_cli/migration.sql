-- The headless CLI gets its own origin (F094).
--
-- Until now the CLI created threads as CODING_AGENT, so a thread started from
-- a terminal was indistinguishable from one started in VS Code. The new value
-- lets each surface label where a thread began. Existing rows are untouched:
-- no thread moves, and every coding-agent read admits both values.
ALTER TYPE "ThreadOrigin" ADD VALUE IF NOT EXISTS 'CODING_AGENT_CLI';
