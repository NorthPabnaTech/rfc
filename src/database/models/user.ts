import { type HydratedDocument, type Model, Schema, type Types } from 'mongoose';

import { USER_ROLES, type UserRole } from '@lib/constants';

import { baseSchemaOptions, defineModel, type ImageAsset, imageAssetSchema } from './shared';

export interface User {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  avatar?: ImageAsset;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 20 },
    // Never returned by default; select('+passwordHash') where a check needs it.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'customer', index: true },
    avatar: imageAssetSchema,
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  baseSchemaOptions,
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ name: 'text', email: 'text', phone: 'text' });

export const UserModel: Model<User> = defineModel<User>('User', userSchema);
