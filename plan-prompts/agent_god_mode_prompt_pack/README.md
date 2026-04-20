# ClawAI Desktop Agent — GOD Mode Prompt Pack

This pack converts the uploaded audit into an implementation-oriented prompt system for Claude (or any strong coding model) to turn ClawAI's desktop agent into a durable, low-friction, high-trust, OS-level automation product.

## Source basis
This pack is based on the uploaded desktop-agent audit report dated 2026-04-20, including the findings that:
- CLI auth currently relies on copying a short-lived user JWT into `claw-agent register --key`, which is high-friction and leaks credentials into shell history.
- The CLI stores session data in plain JSON under `~/.claw-agent/config.json`.
- Session handling currently expires the agent after missed heartbeats with no refresh flow.
- There is no `/auth/refresh`, no durable device concept, and no webapp "Connect CLI" UX.
- The service already suggests a north-star of magic-link pairing + RFC 8628 device-code fallback + rotating refresh tokens + OS keychain storage.
- High-value expansion areas include streaming terminal output, cancel/timeout, policy engine, scripts/schedules, file transfer, git-native ops, browser control, clipboard, local research, team devices, and stronger audit/safety.

## How to use this pack
Run the prompts in order. Do not collapse everything into one giant epic. Each prompt is designed to make the model focus on one implementation slice and not miss details.

Recommended order:
1. 00_master_mission.md
2. 01_audit_restate_and_gap_map.md
3. 02_auth_replatform_strategy.md
4. 03_device_pairing_magic_link.md
5. 04_device_code_fallback_and_headless.md
6. 05_token_refresh_rotation_revocation.md
7. 06_cli_rearchitecture_and_keychain.md
8. 07_agent_service_schema_and_guards.md
9. 08_webapp_connect_device_ux.md
10. 09_streaming_terminal_and_command_runtime.md
11. 10_safety_policy_scopes_and_audit.md
12. 11_power_features_os_files_git_browser.md
13. 12_chat_integration_and_agentic_workflows.md
14. 13_team_devices_admin_and_enterprise.md
15. 14_testing_tdd_security_and_quality.md
16. 15_release_plan_metrics_and_rollout.md

## Target outcome
The final system should feel like:
- one-click browser-based CLI/device pairing
- durable long-lived device authorization with safe refresh and instant revocation
- powerful local execution with streaming, cancellation, policies, and auditable actions
- deep connection between webapp/chat and the user's actual machine
- strong product-market value for engineers, DevOps, data scientists, and privacy-sensitive self-hosted customers
