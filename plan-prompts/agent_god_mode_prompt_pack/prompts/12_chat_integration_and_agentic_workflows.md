# 12 — Chat Integration and Agentic Workflows Prompt

Make the desktop agent deeply useful inside ClawAI chat and agent experiences.

Design workflows such as:
- "Run this" button in chat
- approve-and-execute from assistant suggestions
- stream terminal output back into the conversation
- use local repo/files as context in research or coding chats
- ask the agent to inspect a local project before answering
- upload artifacts back into the thread
- propose patches and apply after approval
- open files/projects locally
- run repeatable local workflows from chat
- target a specific device or device group

You must define:
1. UX and message components
2. backend orchestration between chat-service and agent-service
3. how router/final-model selection should work when local agent is involved
4. how actions are approved, streamed, summarized, and archived
5. how local agent results become citations/context safely
6. how to prevent overreach by the model
7. high-value prebuilt workflows
8. failure handling and human handoff
9. telemetry and success metrics

Think like a product strategist, not only an engineer. This should create demo-worthy moments and sticky usage.
