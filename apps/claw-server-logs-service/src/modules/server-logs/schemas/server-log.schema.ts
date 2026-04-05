import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";

@Schema({ collection: "server_logs", timestamps: true })
export class ServerLog extends Document {
  @Prop({ required: true, index: true })
  level!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ required: true, index: true })
  serviceName!: string;

  @Prop()
  module?: string;

  @Prop()
  controller?: string;

  @Prop()
  service?: string;

  @Prop()
  manager?: string;

  @Prop()
  repository?: string;

  @Prop({ index: true })
  action?: string;

  @Prop()
  route?: string;

  @Prop()
  method?: string;

  @Prop()
  statusCode?: number;

  @Prop({ index: true })
  requestId?: string;

  @Prop({ index: true })
  traceId?: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ index: true })
  threadId?: string;

  @Prop()
  messageId?: string;

  @Prop()
  connectorId?: string;

  @Prop()
  provider?: string;

  @Prop()
  model?: string;

  @Prop()
  latencyMs?: number;

  @Prop()
  errorCode?: string;

  @Prop()
  errorMessage?: string;

  @Prop()
  errorStack?: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  metadata?: Record<string, unknown>;

  @Prop({ default: Date.now, index: true, expires: 2_592_000 })
  createdAt!: Date;
}

export const ServerLogSchema = SchemaFactory.createForClass(ServerLog);

ServerLogSchema.index({ message: "text" });
