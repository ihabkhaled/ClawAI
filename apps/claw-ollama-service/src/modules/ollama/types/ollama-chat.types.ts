// Native Ollama `/api/chat` shapes.
//
// `/api/generate` is prompt-completion: no message array, no roles, no tool
// concept — there is nothing to attach tools to. `/api/chat` is the only Ollama
// surface that accepts tool definitions and returns `message.tool_calls`, which
// makes it the only local-Ollama path an agent run can use.
//
// Reference: https://docs.ollama.com/capabilities/tool-calling

export interface OllamaToolFunctionSpec {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface OllamaToolSpec {
  type: string;
  function: OllamaToolFunctionSpec;
}

export interface OllamaToolCall {
  id?: string;
  type?: string;
  function: {
    name: string;
    // Native Ollama sends tool-call arguments as an OBJECT, unlike the
    // OpenAI-compatible surface which sends a JSON string.
    arguments: Record<string, unknown>;
  };
}

export interface ChatMessage {
  role: string;
  content: string;
  // Raw base64 payloads, no `data:` URI prefix — the native shape.
  images?: string[];
  thinking?: string;
  // Set on a `role: 'tool'` message to correlate it with the call it answers.
  tool_call_id?: string;
  // Echoed back on the assistant turn that requested the calls.
  tool_calls?: OllamaToolCall[];
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  think?: boolean;
  tools?: OllamaToolSpec[];
  options?: Record<string, unknown>;
  keepAlive?: string;
  format?: string | Record<string, unknown>;
}

export interface ChatResponse {
  model: string;
  createdAt: string;
  message: ChatMessage;
  done: boolean;
  doneReason?: string;
  totalDuration?: number;
  loadDuration?: number;
  promptEvalCount?: number;
  evalCount?: number;
  evalDuration?: number;
}

// Wire shape returned by Ollama itself, before snake_case is normalized.
export interface OllamaNativeChatResponse {
  model: string;
  created_at?: string;
  message?: {
    role?: string;
    content?: string;
    thinking?: string;
    tool_calls?: OllamaToolCall[];
  };
  done?: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}
