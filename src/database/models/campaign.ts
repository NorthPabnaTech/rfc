import { type Model, Schema, type Types } from 'mongoose';

import {
  CAMPAIGN_SCOPES,
  CAMPAIGN_TYPES,
  type CampaignScope,
  type CampaignType,
  DISCOUNT_TYPES,
  type DiscountType,
} from '@lib/constants';

import { baseSchemaOptions, defineModel } from './shared';

/**
 * Promotional campaign (automatic offer or coupon code) with percentage or
 * fixed-amount discount, targeting all products or specific products within a
 * scheduled date range.
 */
export interface Campaign {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  type: CampaignType;
  couponCode?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  scope: CampaignScope;
  products: Types.ObjectId[];
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  showOnHome: boolean;
  showModal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<Campaign>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 300 },
    type: { type: String, enum: CAMPAIGN_TYPES, required: true, default: 'offer' },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 32,
      default: null,
    },
    discountType: { type: String, enum: DISCOUNT_TYPES, required: true, default: 'percentage' },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    scope: { type: String, enum: CAMPAIGN_SCOPES, required: true, default: 'all' },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    showOnHome: { type: Boolean, default: true },
    showModal: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

campaignSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });
campaignSchema.index({ couponCode: 1 }, { sparse: true });

export const CampaignModel: Model<Campaign> = defineModel<Campaign>('Campaign', campaignSchema);
