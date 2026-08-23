import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, type QueryFilter } from 'mongoose';
import { FeedbackTicket } from '../schemas/feedback-ticket.schema';
import { FeedbackCounter } from '../schemas/feedback-counter.schema';
import { FEEDBACK_TICKET_NUMBER_PATTERN } from '../constants/feedback-sanitizer.constants';
import type { FeedbackListParams, FeedbackStatusPatch } from '../types/feedback.types';
import { FEEDBACK_TICKET_NUMBER_PAD, FEEDBACK_TICKET_PREFIX } from '@claw/shared-constants';

@Injectable()
export class FeedbackRepository {
  constructor(
    @InjectModel(FeedbackTicket.name) private readonly ticketModel: Model<FeedbackTicket>,
    @InjectModel(FeedbackCounter.name) private readonly counterModel: Model<FeedbackCounter>,
  ) {}

  async nextTicketNumber(): Promise<string> {
    const counter = await this.counterModel
      .findOneAndUpdate({ _id: 'feedback' }, { $inc: { seq: 1 } }, { upsert: true, new: true })
      .exec();
    return `${FEEDBACK_TICKET_PREFIX}-${(counter?.seq ?? 1).toString().padStart(FEEDBACK_TICKET_NUMBER_PAD, '0')}`;
  }

  async create(doc: Partial<FeedbackTicket>) {
    return new this.ticketModel(doc).save();
  }
  async findById(id: string) {
    return this.ticketModel.findById(id).exec();
  }
  async findByIdForUser(id: string, userId: string) {
    return this.ticketModel.findOne({ _id: id, userId }).exec();
  }
  async findByTicketNumber(ticketNumber: string) {
    return this.ticketModel.findOne({ ticketNumber }).exec();
  }

  async findPaginated(p: FeedbackListParams) {
    // userId MUST be part of the query, never a post-fetch comparison. It was
    // accepted as a parameter and then dropped here, so `GET /feedback/mine`
    // returned every user's tickets — an IDOR that the ownership check on the
    // single-ticket route did not cover.
    // A ticket number is looked up exactly, not through the text index. Mongo
    // tokenises `FDB-000003` on the hyphen, so `FDB` matched every ticket and
    // searching for one number returned the whole table.
    const search = p.search?.trim();
    const ticketNumberSearch =
      search !== undefined && FEEDBACK_TICKET_NUMBER_PATTERN.test(search)
        ? search.toUpperCase()
        : undefined;

    const filter: QueryFilter<FeedbackTicket> = {
      ...(p.userId && { userId: p.userId }),
      ...(p.status && { status: p.status }),
      ...(p.type && { type: p.type }),
      ...(ticketNumberSearch !== undefined
        ? { ticketNumber: ticketNumberSearch }
        : (search
          ? { $text: { $search: search } }
          : {})),
    };
    const [items, total] = await Promise.all([
      this.ticketModel
        .find(filter)
        .sort({ [p.sortBy || 'createdAt']: p.sortDir === 'asc' ? 1 : -1 })
        .skip((p.page - 1) * p.limit)
        .limit(p.limit)
        .exec(),
      this.ticketModel.countDocuments(filter).exec(),
    ]);
    return { items, total, page: p.page, limit: p.limit };
  }

  async countsByStatus(): Promise<Record<string, number>> {
    const res = await this.ticketModel
      .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      .exec();
    return res.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c._id]: c.count }), {});
  }

  async applyStatusChange(id: string, patch: FeedbackStatusPatch) {
    return this.ticketModel
      .findByIdAndUpdate(id, { $set: patch.set, $push: { history: patch.history } }, { new: true })
      .exec();
  }
}
