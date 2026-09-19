# Coding Agent Surface Catalog

Generated from the standalone extension package (v1.72.0).

## Commands (43)
| Command | Title |
| --- | --- |
| `clawAI.connect` | %command.connect% |
| `clawAI.logout` | %command.logout% |
| `clawAI.openChat` | %command.openChat% |
| `clawAI.askSelection` | %command.askSelection% |
| `clawAI.askFile` | %command.askFile% |
| `clawAI.askWorkspace` | %command.askWorkspace% |
| `clawAI.compareModels` | %command.compareModels% |
| `clawAI.judgeResponses` | %command.judgeResponses% |
| `clawAI.generateCode` | %command.generateCode% |
| `clawAI.fixCode` | %command.fixCode% |
| `clawAI.reviewCode` | %command.reviewCode% |
| `clawAI.generateTests` | %command.generateTests% |
| `clawAI.generatePlan` | %command.generatePlan% |
| `clawAI.generateDocs` | %command.generateDocs% |
| `clawAI.auditWorkspace` | %command.auditWorkspace% |
| `clawAI.initializeWorkspace` | %command.initializeWorkspace% |
| `clawAI.openGlobalRules` | %command.openGlobalRules% |
| `clawAI.openGlobalSkills` | %command.openGlobalSkills% |
| `clawAI.refreshModels` | %command.refreshModels% |
| `clawAI.selectModel` | %command.selectModel% |
| `clawAI.cancel` | %command.cancel% |
| `clawAI.undoLastEdit` | %command.undoLastEdit% |
| `clawAI.exportTranscript` | %command.exportTranscript% |
| `clawAI.showSessionRecap` | %command.showSessionRecap% |
| `clawAI.createCheckpoint` | %command.createCheckpoint% |
| `clawAI.restoreCheckpoint` | %command.restoreCheckpoint% |
| `clawAI.askSideQuestion` | %command.askSideQuestion% |
| `clawAI.attachTerminalOutput` | %command.attachTerminalOutput% |
| `clawAI.openTerminal` | %command.openTerminal% |
| `clawAI.toggleFastMode` | %command.toggleFastMode% |
| `clawAI.groupConversation` | %command.groupConversation% |
| `clawAI.openConversationInNewWindow` | %command.openConversationInNewWindow% |
| `clawAI.compactConversation` | %command.compactConversation% |
| `clawAI.selectOutputStyle` | %command.selectOutputStyle% |
| `clawAI.toggleFocusView` | %command.toggleFocusView% |
| `clawAI.renameChat` | %command.renameChat% |
| `clawAI.archiveChat` | %command.archiveChat% |
| `clawAI.browseArchivedChats` | %command.browseArchivedChats% |
| `clawAI.reopenClosedChat` | %command.reopenClosedChat% |
| `clawAI.showUsage` | %command.showUsage% |
| `clawAI.searchRunHistory` | %command.searchRunHistory% |
| `clawAI.sendFeedback` | %command.sendFeedback% |
| `clawAI.showLogs` | %command.showLogs% |

## Settings (24)
| Setting | Type | Default | Scope |
| --- | --- | --- | --- |
| `clawAI.backendUrl` | string | "https://claw.local" | machine |
| `clawAI.backendEnvironment` | string | "LOCAL" | machine |
| `clawAI.backendCustomUrl` | string | "" | machine |
| `clawAI.frontendEnvironment` | string | "LOCAL" | machine |
| `clawAI.frontendCustomUrl` | string | "" | machine |
| `clawAI.requestTimeoutMs` | number | 60000 | machine |
| `clawAI.routingMode` | string | "AUTO" | resource |
| `clawAI.telemetryEndpoint` | string | "" | machine |
| `clawAI.telemetryHeaders` | object | {} | machine |
| `clawAI.browserOrigins` | array | [] | resource |
| `clawAI.autoCompact` | string | "prompt" | resource |
| `clawAI.agentMode` | string | "AUTO" | resource |
| `clawAI.hooks` | array | [] | resource |
| `clawAI.outputStyle` | string | "default" | resource |
| `clawAI.viewDensity` | string | "full" | resource |
| `clawAI.effortMode` | string | "ULTRA" | resource |
| `clawAI.speedMode` | string | "1X" | resource |
| `clawAI.permissionMode` | string | "ASK" | resource |
| `clawAI.selectedModel` | string | "" | resource |
| `clawAI.autosave` | string | "off" | resource |
| `clawAI.maxContextBytes` | number | 200000 | resource |
| `clawAI.maxContextFiles` | number | 40 | resource |
| `clawAI.exclude` | array | ["**/.git/**","**/node_modules/**","**/dist/**","**/build/**","**/coverage/**","**/.env*","**/*secret*","**/*credential*"] | resource |
| `clawAI.historyLimit` | number | 50 | window |

## Views (9)
| View id | Name |
| --- | --- |
| `clawAI.chat` | %view.chat% |
| `clawAI.setup` | %view.setup% |
| `clawAI.model` | %view.model% |
| `clawAI.context` | %view.context% |
| `clawAI.history` | %view.history% |
| `clawAI.attention` | %view.attention% |
| `clawAI.tasks` | %view.tasks% |
| `clawAI.findings` | %view.findings% |
| `clawAI.artifacts` | %view.artifacts% |

## Keybindings (11)
| Command | Windows/Linux | macOS | When |
| --- | --- | --- | --- |
| `clawAI.openChat` | ctrl+shift+a | cmd+shift+a | — |
| `clawAI.askSelection` | ctrl+shift+enter | cmd+shift+enter | editorTextFocus && editorHasSelection |
| `clawAI.cancel` | ctrl+alt+escape | cmd+alt+escape | — |
| `clawAI.undoLastEdit` | ctrl+alt+z | cmd+alt+z | — |
| `clawAI.toggleFocusView` | ctrl+alt+f | cmd+alt+f | — |
| `clawAI.reopenClosedChat` | ctrl+alt+t | cmd+alt+t | — |
| `clawAI.selectModel` | ctrl+alt+m | cmd+alt+m | — |
| `clawAI.searchRunHistory` | ctrl+alt+h | cmd+alt+h | — |
| `clawAI.reviewCode` | ctrl+alt+r | cmd+alt+r | editorTextFocus |
| `clawAI.generateTests` | ctrl+alt+u | cmd+alt+u | editorTextFocus |
| `clawAI.fixCode` | ctrl+alt+x | cmd+alt+x | editorTextFocus && editorHasSelection |

The standalone repo also maintains a generated parity/surface inventory with call paths, test evidence and PASS/FAIL/BLOCKED/NOT RUN status.
