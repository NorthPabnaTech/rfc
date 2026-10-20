import { type Model, Schema, type Types } from 'mongoose';

import { NOTIFICATION_TYPES, type NotificationType } from '@lib/constants';

import { baseSchemaOptions, defineModel } from './shared';

/**
 * One notification for one recipient. Admin notifications are fanned out to
 * every admin, so each admin has their own seen/read state.
 *
 * - `seenAt` — set when the recipient opens the bell; drives the badge count.
 * - `readAt` — set when the recipient clicks the notification itself.
 */
export interface Notification {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  /** In-app path opened on click, e.g. /admin/orders/<id>. */
  link: string;
  order?: Types.ObjectId | null;
  seenAt?: Date | null;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<Notification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    link: { type: String, required: true, trim: true, maxlength: 300 },
    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    seenAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
  },
  baseSchemaOptions,
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, seenAt: 1 });
// Old notifications clean themselves up after 90 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const NotificationModel: Model<Notification> = defineModel<Notification>(
  'Notification',
  notificationSchema,
);
