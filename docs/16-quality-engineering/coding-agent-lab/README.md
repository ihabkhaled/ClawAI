# Coding Agent Qualification Lab

State for the mentor-driven qualification lab described by
`ClawAI_Coding_Agent_Mentor_Driven_Feature_Qualification_Lab_Prompt_Pack_2026-08-07`.

| File                                                                       | Holds                                                                    |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`CURRENT_BENCHMARK_STATE.md`](CURRENT_BENCHMARK_STATE.md)                 | Read this first on resume. Stage, versions, blockers, exact next action. |
| [`MENTOR_LAB_LEDGER.md`](MENTOR_LAB_LEDGER.md)                             | Baseline and every iteration in order.                                   |
| [`CODING_AGENT_RELEASE_LEDGER.md`](CODING_AGENT_RELEASE_LEDGER.md)         | Every extension version produced during the lab, with its evidence.      |
| [`PASSWORD_RESET_AGENT_PROVENANCE.md`](PASSWORD_RESET_AGENT_PROVENANCE.md) | Feature file → agent run. Certification depends on it.                   |

## The one rule

The mentor does not implement Password Reset. The ClawAI Coding Agent does. When
the agent's feature code is wrong, the mentor reviews it and prompts the agent
to fix its own work. When the agent fails because the coding-agent product is
defective, the mentor repairs the product, releases it, installs it, reloads,
and hands the same step back.

A feature that works because the mentor wrote it is a failed qualification.
