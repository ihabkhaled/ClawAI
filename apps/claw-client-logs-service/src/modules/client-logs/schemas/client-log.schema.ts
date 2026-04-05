import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ collection: "client_logs", timestamps: true })
export class ClientLog extends Document {
  @Prop({ required: true })
  level!: string;

  @Prop({ required: true })
  message!: string;

  @Prop()
  component?: string;

  @Prop()
  action?: string;

  @Prop()
  route?: string;

  @Prop()
  userId?: string;

  @Prop()
  sessionId?: string;

  @Prop()
  threadId?: string;

  @Prop()
  connectorId?: string;

  @Prop()
  requestId?: string;

  @Prop()
  locale?: string;

  @Prop()
  appearance?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  errorCode?: string;

  @Prop()
  errorStack?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata?: Record<string, unknown>;

  @Prop({ type: Date, default: Date.now, expires: 30 * 24 * 60 * 60 })
  createdAt!: Date;
}

export const ClientLogSchema = SchemaFactory.createForClass(ClientLog);

ClientLogSchema.index({ level: 1 });
ClientLogSchema.index({ component: 1 });
ClientLogSchema.index({ action: 1 });
ClientLogSchema.index({ userId: 1 });
ClientLogSchema.index({ route: 1 });
ClientLogSchema.index({ message: "text" });
