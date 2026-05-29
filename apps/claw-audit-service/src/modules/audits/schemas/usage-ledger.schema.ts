import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ collection: "usage_ledger", timestamps: true })
export class UsageLedger extends Document {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  resourceType!: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true, default: 0 })
  quantity!: number;

  @Prop()
  unit?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  // Call context for the usage entry (e.g. chat, compare, judge, repair, verify).
  // Optional + schemaless-friendly: legacy rows without it keep working.
  @Prop()
  context?: string;

  // Whether the recorded token quantity is an estimate rather than a provider-reported count.
  @Prop()
  estimated?: boolean;

  @Prop({ default: Date.now })
  createdAt!: Date;
}

export const UsageLedgerSchema = SchemaFactory.createForClass(UsageLedger);

// Indexes to support per-user usage attribution and context filtering/aggregation.
UsageLedgerSchema.index({ userId: 1, createdAt: -1 });
UsageLedgerSchema.index({ context: 1 });
