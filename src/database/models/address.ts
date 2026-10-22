import { type Model, Schema, type Types } from 'mongoose';

import { SHIPPING_ZONES, type ShippingZone } from '@lib/constants';

import { baseSchemaOptions, defineModel } from './shared';

export interface Address {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  /** e.g. "Home", "Office". */
  label: string;
  fullName: string;
  phone: string;
  addressLine: string;
  /** Older addresses (before the location dropdowns) may not have one. */
  division?: string;
  /** Upazila / thana. */
  area?: string;
  /** District. */
  city: string;
  zone: ShippingZone;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The fields of an address that get copied (snapshotted) onto an order, so
 * later edits to a saved address never rewrite where a past order shipped.
 */
export type AddressSnapshot = Pick<
  Address,
  'fullName' | 'phone' | 'addressLine' | 'division' | 'area' | 'city' | 'zone'
>;

export const addressSnapshotSchema = new Schema<AddressSnapshot>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    addressLine: { type: String, required: true, trim: true, maxlength: 300 },
    division: { type: String, trim: true, maxlength: 40 },
    area: { type: String, trim: true, maxlength: 100 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    zone: { type: String, enum: SHIPPING_ZONES, required: true },
  },
  { _id: false },
);

const addressSchema = new Schema<Address>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, trim: true, default: 'Home', maxlength: 40 },
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    addressLine: { type: String, required: true, trim: true, maxlength: 300 },
    division: { type: String, trim: true, maxlength: 40 },
    area: { type: String, trim: true, maxlength: 100 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    zone: { type: String, enum: SHIPPING_ZONES, required: true },
    isDefault: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

export const AddressModel: Model<Address> = defineModel<Address>('Address', addressSchema);
