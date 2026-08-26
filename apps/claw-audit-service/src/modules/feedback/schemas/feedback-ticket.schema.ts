import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';
import type {
  FeedbackAttachment,
  FeedbackHistoryEntry,
  FeedbackPageContext,
} from '../types/feedback.types';

@Schema({ collection: 'feedback_tickets', timestamps: true })
export class FeedbackTicket {
  @Prop({ required: true, unique: true, index: true }) ticketNumber!: string;
  @Prop({ required: true, index: true }) userId!: string;
  @Prop({ required: true }) reporterEmail!: string;
  @Prop() reporterName?: string;
  @Prop({ required: true, index: true }) type!: string;
  @Prop({ required: true }) title!: string;
  @Prop() subject?: string;
  @Prop({ required: true }) contentMarkdown!: string;
  @Prop({ required: true }) searchText!: string;
  @Prop({ required: true, default: 'OPEN', index: true }) status!: string;
  @Prop({ type: Array, default: [] }) attachments!: FeedbackAttachment[];
  @Prop({ type: Object }) pageContext?: FeedbackPageContext;
  @Prop({ type: Array, default: [] }) history!: FeedbackHistoryEntry[];
  @Prop() resolvedAt?: Date;
  @Prop() closedAt?: Date;
  @Prop() archivedAt?: Date;
  @Prop() reopenedAt?: Date;
  @Prop() lastActorId?: string;
  @Prop() createdAt?: Date;
  @Prop() updatedAt?: Date;
}

export type FeedbackTicketDocument = HydratedDocument<FeedbackTicket>;

export const FeedbackTicketSchema = SchemaFactory.createForClass(FeedbackTicket);
FeedbackTicketSchema.index({ status: 1, createdAt: -1 });
FeedbackTicketSchema.index({ userId: 1, createdAt: -1 });
FeedbackTicketSchema.index({ type: 1, createdAt: -1 });
FeedbackTicketSchema.index({
  ticketNumber: 'text',
  title: 'text',
  subject: 'text',
  searchText: 'text',
});

// Serialise a ticket as the API contract, not as a Mongo document. Without
// this the responses carried `_id`, `__v` and the internal `searchText` blob
// straight to the client, and never carried `id` — so the admin table had no
// stable React key and clicking a row passed `undefined` to the detail dialog.
FeedbackTicketSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_document, record) => {
    const output = record as unknown as Record<string, unknown>;
    output.id = String(output._id);
    delete output._id;
    delete output.searchText;
    return output;
  },
});
