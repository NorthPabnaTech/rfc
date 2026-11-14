import { type Model, Schema, type Types } from 'mongoose';

import { UPLOAD_FOLDERS, type UploadPurpose } from '@lib/constants';

import { baseSchemaOptions, defineModel } from './shared';

const PURPOSES = Object.keys(UPLOAD_FOLDERS) as [UploadPurpose, ...UploadPurpose[]];

export interface MediaAsset {
  _id: Types.ObjectId;
  filename: string;
  url: string;
  publicId: string;
  mimeType: string;
  format?: string;
  bytes: number;
  width?: number;
  height?: number;
  purpose: UploadPurpose;
  sha256?: string;
  uploadedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const mediaAssetSchema = new Schema<MediaAsset>(
  {
    filename: { type: String, required: true, trim: true, maxlength: 240 },
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true, maxlength: 80 },
    format: { type: String, trim: true, maxlength: 20 },
    bytes: { type: Number, required: true, min: 0, default: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    purpose: { type: String, enum: PURPOSES, required: true, index: true },
    sha256: { type: String, trim: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  baseSchemaOptions,
);

mediaAssetSchema.index({ publicId: 1 }, { unique: true });
mediaAssetSchema.index({ createdAt: -1 });
mediaAssetSchema.index({ filename: 'text' });

export const MediaAssetModel: Model<MediaAsset> = defineModel<MediaAsset>(
  'MediaAsset',
  mediaAssetSchema,
);
