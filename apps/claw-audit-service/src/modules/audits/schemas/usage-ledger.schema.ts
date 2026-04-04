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

  @Prop({ default: Date.now })
  createdAt!: Date;
}

export const UsageLedgerSchema = SchemaFactory.createForClass(UsageLedger);
