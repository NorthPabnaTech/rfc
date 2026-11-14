import { type Model, Schema, type Types } from 'mongoose';

import {
  SUPPLIER_PROVIDERS,
  SUPPLIER_STATUSES,
  SUPPLIER_TYPES,
  type SupplierProvider,
  type SupplierStatus,
  type SupplierType,
} from '@lib/constants';

import { baseSchemaOptions, defineModel } from './shared';

export interface Supplier {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  websiteUrl: string;
  status: SupplierStatus;
  type: SupplierType;
  provider?: SupplierProvider;
  apiBaseUrl?: string;
  /** Name of the environment variable holding the API key (never the key itself). */
  apiKeyEnvVar?: string;
  /** Optional x-domain header if the supplier API key is domain-locked. */
  apiDomain?: string;
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncAt?: Date;
  lastSyncStatus?: 'ok' | 'error';
  lastSyncError?: string;
  lastSyncUpdatedCount?: number;
  deliveryCharges?: { insideDhaka: number; outsideDhaka: number };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<Supplier>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    websiteUrl: { type: String, required: true, trim: true, maxlength: 300 },
    status: { type: String, enum: SUPPLIER_STATUSES, default: 'active' },
    type: { type: String, enum: SUPPLIER_TYPES, default: 'manual', index: true },
    provider: { type: String, enum: SUPPLIER_PROVIDERS },
    apiBaseUrl: { type: String, trim: true, maxlength: 300 },
    apiKeyEnvVar: { type: String, trim: true, maxlength: 100 },
    apiDomain: { type: String, trim: true, maxlength: 200 },
    syncEnabled: { type: Boolean, default: true },
    syncIntervalMinutes: { type: Number, default: 30, min: 5, max: 1440 },
    lastSyncAt: Date,
    lastSyncStatus: { type: String, enum: ['ok', 'error'] },
    lastSyncError: { type: String, trim: true, maxlength: 1000 },
    lastSyncUpdatedCount: { type: Number, min: 0 },
    deliveryCharges: {
      insideDhaka: { type: Number, min: 0 },
      outsideDhaka: { type: Number, min: 0 },
    },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  baseSchemaOptions,
);

supplierSchema.index({ slug: 1 }, { unique: true });

export const SupplierModel: Model<Supplier> = defineModel<Supplier>('Supplier', supplierSchema);
