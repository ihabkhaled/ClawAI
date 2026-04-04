import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ collection: "audit_logs", timestamps: true })
export class AuditLog extends Document {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  action!: string;

  @Prop()
  entityType?: string;

  @Prop()
  entityId?: string;

  @Prop({ required: true, default: "LOW" })
  severity!: string;

  @Prop({ type: Object })
  details?: Record<string, unknown>;

  @Prop()
  ipAddress?: string;

  @Prop({ default: Date.now })
  createdAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
