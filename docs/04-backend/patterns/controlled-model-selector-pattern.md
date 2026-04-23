# Pattern: Controlled Model Selector (Frontend)

> Used in claw-frontend to sync the bottom chat composer model selector with the thread settings panel model selector. Both show the same value and changes in either auto-persist to the thread.

## Problem

The chat page has two places to change the active model:

1. The **Thread Settings panel** (full settings dialog)
2. The **Message Composer** (bottom of chat, inline model selector)

Previously these were independent — changing one didn't update the other, and neither auto-saved to the thread.

## Solution: Single source of truth in `useThreadSettings` hook, passed down as controlled props.

## Architecture

```
ThreadDetailPage
  └── useThreadDetailPage()
        └── useThreadSettings(threadId)
              ├── selectedModel (state)
              ├── handleModelChange() — sets state + auto-persists to API
              └── exposes: { selectedModel, handleModelChange }

Page wires both selectors to the same source:
  ThreadSettings panel: value={threadSettings.selectedModel} onChange={threadSettings.handleModelChange}
  MessageComposer:       selectedModel={threadSettings.selectedModel} onModelChange={threadSettings.handleModelChange}
```

## Implementation

### `useThreadSettings` — the single source of truth

```typescript
const handleModelChange = useCallback(
  (model: ModelSelection | null): void => {
    // 1. Update local state immediately (optimistic UI)
    setSelectedModel(model);
    // 2. Persist to API (background, no await)
    if (thread) {
      updateThread({
        id: thread.id,
        data: {
          preferredProvider: model?.provider ?? null,
          preferredModel: model?.model ?? null,
        },
      });
    }
  },
  [thread, updateThread],
);
```

### `MessageComposer` — fully controlled component

```typescript
// Props:
type MessageComposerProps = {
  onSend: (content: string, modelSelection?: ModelSelection, ...) => void;
  isPending: boolean;
  selectedModel: ModelSelection | null;     // controlled: from thread settings
  onModelChange: (model: ModelSelection | null) => void;  // controlled: goes to thread settings
};

// No internal model state — driven entirely by props
```

### Page wiring

```typescript
// page.tsx — both selectors share the same handlers
<ThreadSettings
  selectedModel={threadSettings.selectedModel}
  onModelChange={threadSettings.handleModelChange}
  ...
/>
<MessageComposer
  selectedModel={threadSettings.selectedModel}
  onModelChange={threadSettings.handleModelChange}
  ...
/>
```

## Rules for This Pattern

1. The parent hook (`useThreadSettings`) owns the state — components are controlled
2. Auto-persist fires on every change (no separate "save" button needed for model selection)
3. The initial value is loaded from the thread's `preferredProvider` / `preferredModel` fields
4. If the thread has no preference, `selectedModel` is `null` (AUTO routing)
5. `AUTO` mode: `null` selection → routing service decides the model
6. Manual mode: non-null selection → chat service forces that provider/model

## Related Types

```typescript
// src/types/component.types.ts
type ModelSelection = {
  provider: string; // e.g., 'ANTHROPIC', 'OPENAI', 'OLLAMA'
  model: string; // e.g., 'claude-sonnet-4-6', 'gpt-4o', 'glm4:latest'
};

// src/types/hook.types.ts
type UseThreadSettingsReturn = {
  selectedModel: ModelSelection | null;
  handleModelChange: (value: ModelSelection | null) => void;
  // ... other settings
};
```
