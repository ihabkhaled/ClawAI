import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Schema as MongooseSchema } from 'mongoose';

// A single counter document per sequence name. `_id` is the sequence name, so
// allocating a ticket number is one atomic findOneAndUpdate with $inc.
@Schema({ collection: 'feedback_counters' })
export class FeedbackCounter {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ type: Number, default: 0 })
  seq!: number;
}

export const FeedbackCounterSchema: MongooseSchema<FeedbackCounter> =
  SchemaFactory.createForClass(FeedbackCounter);
