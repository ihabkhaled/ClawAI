import { ConnectorProvider } from "@/enums";

export const PROVIDER_DISPLAY_NAMES: Record<ConnectorProvider, string> = {
  [ConnectorProvider.OPENAI]: "OpenAI",
  [ConnectorProvider.ANTHROPIC]: "Anthropic",
  [ConnectorProvider.GEMINI]: "Google Gemini",
  [ConnectorProvider.AWS_BEDROCK]: "AWS Bedrock",
  [ConnectorProvider.DEEPSEEK]: "DeepSeek",
  [ConnectorProvider.OLLAMA]: "Ollama",
};

export const PROVIDER_ICON_COLORS: Record<ConnectorProvider, string> = {
  [ConnectorProvider.OPENAI]: "bg-emerald-100 text-emerald-700",
  [ConnectorProvider.ANTHROPIC]: "bg-orange-100 text-orange-700",
  [ConnectorProvider.GEMINI]: "bg-blue-100 text-blue-700",
  [ConnectorProvider.AWS_BEDROCK]: "bg-amber-100 text-amber-700",
  [ConnectorProvider.DEEPSEEK]: "bg-violet-100 text-violet-700",
  [ConnectorProvider.OLLAMA]: "bg-slate-100 text-slate-700",
};

export const AUTH_TYPE_LABELS: Record<string, string> = {
  api_key: "API Key",
  oauth2: "OAuth 2.0",
  aws_iam: "AWS IAM",
  none: "None",
};

export const CONNECTOR_STATUS_LABELS: Record<string, string> = {
  HEALTHY: "Healthy",
  DEGRADED: "Degraded",
  DOWN: "Down",
  UNKNOWN: "Unknown",
};

export const LIFECYCLE_LABELS: Record<string, string> = {
  ga: "GA",
  preview: "Preview",
  deprecated: "Deprecated",
  beta: "Beta",
};
