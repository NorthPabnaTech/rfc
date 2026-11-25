import { type HydratedDocument, type Model, Schema, type Types } from 'mongoose';

import { baseSchemaOptions, defineModel } from './shared';

export interface ResellerFieldChange {
  field: string;
  label: string;
  oldValue?: string;
  newValue?: string;
}

export interface ResellerChangeLog {
  _id: Types.ObjectId;
  reseller: Types.ObjectId;
  changes: ResellerFieldChange[];
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ResellerChangeLogDocument = HydratedDocument<ResellerChangeLog>;

const fieldChangeSchema = new Schema<ResellerFieldChange>(
  {
    field: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    oldValue: { type: String, trim: true },
    newValue: { type: String, trim: true },
  },
  { _id: false },
);

const resellerChangeLogSchema = new Schema<ResellerChangeLog>(
  {
    reseller: { type: Schema.Types.ObjectId, ref: 'Reseller', required: true, index: true },
    changes: { type: [fieldChangeSchema], required: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true, maxlength: 300 },
  },
  baseSchemaOptions,
);

resellerChangeLogSchema.index({ reseller: 1, createdAt: -1 });

export const ResellerChangeLogModel: Model<ResellerChangeLog> = defineModel<ResellerChangeLog>(
  'ResellerChangeLog',
  resellerChangeLogSchema,
);
