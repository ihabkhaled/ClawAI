import { RoutingMode, MessageRole } from "@/enums";

export const ROUTING_MODE_LABELS: Record<RoutingMode, string> = {
  [RoutingMode.AUTO]: "Auto",
  [RoutingMode.MANUAL_MODEL]: "Manual",
  [RoutingMode.LOCAL_ONLY]: "Local Only",
  [RoutingMode.PRIVACY_FIRST]: "Privacy First",
  [RoutingMode.LOW_LATENCY]: "Low Latency",
  [RoutingMode.HIGH_REASONING]: "High Reasoning",
  [RoutingMode.COST_SAVER]: "Cost Saver",
};

export const MESSAGE_ROLE_LABELS: Record<MessageRole, string> = {
  [MessageRole.SYSTEM]: "System",
  [MessageRole.USER]: "You",
  [MessageRole.ASSISTANT]: "Assistant",
  [MessageRole.TOOL]: "Tool",
};

export const THINKING_INDICATOR_LABEL = "AI is thinking...";
export const POLLING_INTERVAL_MS = 2000;
