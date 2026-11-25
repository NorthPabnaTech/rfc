import { type Model, Schema, type Types } from 'mongoose';

import type { ResellerWithdrawalFeeTier } from '@lib/constants';

import { baseSchemaOptions, defineModel } from './shared';

/**
 * Store-wide settings. A singleton: exactly one document, keyed `store`.
 * Read through `getSettings()`, which creates it with defaults on first use.
 */
export interface Settings {
  _id: Types.ObjectId;
  key: 'store';
  storeName: string;
  tagline: string;
  supportPhone: string;
  supportEmail?: string;
  address: string;
  shippingFeeInsideDhaka: number;
  shippingFeeOutsideDhaka: number;
  /** Order subtotal at or above which shipping is free; 0 disables. */
  freeShippingThreshold: number;
  announcement?: string;
  whatsappEnabled: boolean;
  whatsappProductEnabled: boolean;
  whatsappDefaultMessage: string;
  social: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    whatsapp?: string;
    youtube?: string;
  };
  /** Reseller withdrawal fee tiers (empty = no fee). */
  resellerWithdrawalFeeTiers: ResellerWithdrawalFeeTier[];
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_SETTINGS = {
  storeName: 'RFC Gadget',
  tagline: 'Smart gadgets, delivered',
  supportPhone: '01330363517',
  address: 'Hazipara, Uttor Badda, Dhaka',
  shippingFeeInsideDhaka: 70,
  shippingFeeOutsideDhaka: 130,
  freeShippingThreshold: 0,
  whatsappEnabled: true,
  whatsappProductEnabled: true,
  whatsappDefaultMessage:
    'Hello, I visited your website and would like to know more about your products and services.',
} as const;

const settingsSchema = new Schema<Settings>(
  {
    key: { type: String, enum: ['store'], default: 'store' },
    storeName: { type: String, default: DEFAULT_SETTINGS.storeName, trim: true },
    tagline: { type: String, default: DEFAULT_SETTINGS.tagline, trim: true },
    supportPhone: { type: String, default: DEFAULT_SETTINGS.supportPhone, trim: true },
    supportEmail: { type: String, trim: true, lowercase: true },
    address: { type: String, default: DEFAULT_SETTINGS.address, trim: true },
    shippingFeeInsideDhaka: {
      type: Number,
      default: DEFAULT_SETTINGS.shippingFeeInsideDhaka,
      min: 0,
    },
    shippingFeeOutsideDhaka: {
      type: Number,
      default: DEFAULT_SETTINGS.shippingFeeOutsideDhaka,
      min: 0,
    },
    freeShippingThreshold: {
      type: Number,
      default: DEFAULT_SETTINGS.freeShippingThreshold,
      min: 0,
    },
    announcement: { type: String, trim: true, maxlength: 200 },
    whatsappEnabled: { type: Boolean, default: DEFAULT_SETTINGS.whatsappEnabled },
    whatsappProductEnabled: { type: Boolean, default: DEFAULT_SETTINGS.whatsappProductEnabled },
    whatsappDefaultMessage: {
      type: String,
      default: DEFAULT_SETTINGS.whatsappDefaultMessage,
      trim: true,
      maxlength: 500,
    },
    social: {
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
      tiktok: { type: String, trim: true },
      whatsapp: { type: String, trim: true },
      youtube: { type: String, trim: true },
    },
    resellerWithdrawalFeeTiers: {
      type: [
        new Schema<ResellerWithdrawalFeeTier>(
          {
            minAmount: { type: Number, required: true, min: 0 },
            fee: { type: Number, required: true, min: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  baseSchemaOptions,
);

settingsSchema.index({ key: 1 }, { unique: true });

export const SettingsModel: Model<Settings> = defineModel<Settings>('Settings', settingsSchema);
