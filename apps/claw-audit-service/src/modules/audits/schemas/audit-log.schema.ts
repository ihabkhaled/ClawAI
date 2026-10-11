import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog extends Document {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  action!: string;

  @Prop()
  entityType?: string;

  @Prop()
  entityId?: string;

  @Prop({ required: true, default: 'LOW' })
  severity!: string;

  @Prop({ type: Object })
  details?: Record<string, unknown>;

  @Prop()
  ipAddress?: string;

  @Prop({ default: Date.now })
  createdAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes for the bounded Observability queries (failures window, per-action grouping).
// Mongoose creates them at startup; without them a 1M-row collection is scanned per request.
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
