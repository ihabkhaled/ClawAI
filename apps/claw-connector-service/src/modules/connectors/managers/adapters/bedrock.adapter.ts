import { ConnectorStatus } from "../../../../generated/prisma";
import { type HealthCheckResult, type NormalizedModel } from "../../types/connectors.types";
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from "../provider-adapter.interface";

export class BedrockAdapter implements ProviderAdapter {
  async healthCheck(_config: ConnectorConfig): Promise<HealthCheckResult> {
    return {
      status: ConnectorStatus.UNKNOWN,
      latencyMs: 0,
      errorMessage:
        "AWS Bedrock adapter is not yet implemented. Bedrock requires AWS SDK with IAM authentication.",
    };
  }

  async syncModels(_config: ConnectorConfig): Promise<NormalizedModel[]> {
    throw new Error(
      "AWS Bedrock model sync is not yet implemented. Bedrock requires AWS SDK with IAM authentication.",
    );
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
    };
  }
}
