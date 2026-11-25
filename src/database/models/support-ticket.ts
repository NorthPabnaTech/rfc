import { type Model, Schema, type Types } from 'mongoose';

import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from '@lib/constants';

import { baseSchemaOptions, defineModel } from './shared';

export interface TicketMessage {
  senderRole: 'reseller' | 'admin';
  senderName: string;
  message: string;
  createdAt: Date;
}

export interface SupportTicket {
  _id: Types.ObjectId;
  ticketNumber: string;
  reseller: Types.ObjectId;
  order?: Types.ObjectId | null;
  orderNumber?: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  messages: TicketMessage[];
  lastReplyAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ticketMessageSchema = new Schema<TicketMessage>(
  {
    senderRole: { type: String, enum: ['reseller', 'admin'], required: true },
    senderName: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const supportTicketSchema = new Schema<SupportTicket>(
  {
    ticketNumber: { type: String, required: true, trim: true },
    reseller: { type: Schema.Types.ObjectId, ref: 'Reseller', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    orderNumber: { type: String, trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, trim: true, default: 'General', maxlength: 60 },
    priority: { type: String, enum: TICKET_PRIORITIES, default: 'medium' },
    status: { type: String, enum: TICKET_STATUSES, default: 'open', index: true },
    messages: { type: [ticketMessageSchema], default: [] },
    lastReplyAt: { type: Date, default: Date.now, index: true },
  },
  baseSchemaOptions,
);

supportTicketSchema.index({ ticketNumber: 1 }, { unique: true });
supportTicketSchema.index({ reseller: 1, createdAt: -1 });

export const SupportTicketModel: Model<SupportTicket> = defineModel<SupportTicket>(
  'SupportTicket',
  supportTicketSchema,
);
