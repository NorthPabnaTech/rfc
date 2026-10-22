import { type Model, Schema, type Types } from 'mongoose';

import { baseSchemaOptions, defineModel } from './shared';

/**
 * One browser/device that agreed to system (Web Push) notifications for a
 * signed-in user. The endpoint is unique per browser, so signing in as someone
 * else on the same browser moves the subscription to the new account.
 */
export interface PushSubscription {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<PushSubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true, maxlength: 1000 },
    keys: {
      p256dh: { type: String, required: true, maxlength: 200 },
      auth: { type: String, required: true, maxlength: 100 },
    },
    userAgent: { type: String, maxlength: 300 },
  },
  baseSchemaOptions,
);

export const PushSubscriptionModel: Model<PushSubscription> = defineModel<PushSubscription>(
  'PushSubscription',
  pushSubscriptionSchema,
);
