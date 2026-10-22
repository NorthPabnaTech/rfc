import { type HydratedDocument, type Model, Schema, type Types } from 'mongoose';

import { USER_ROLES, type UserRole } from '@lib/constants';

import { baseSchemaOptions, defineModel, type ImageAsset, imageAssetSchema } from './shared';

export interface User {
  _id: Types.ObjectId;
  name: string;
  /** Optional for customers (they sign up with a mobile number). */
  email?: string;
  /** Unique when set; customers sign in with it. */
  phone?: string;
  passwordHash: string;
  role: UserRole;
  avatar?: ImageAsset;
  isActive: boolean;
  lastLoginAt?: Date;
  /** Sessions issued before this are rejected (set on password reset). */
  passwordChangedAt?: Date;
  /** SHA-256 of the one-time reset token; the raw token is only ever emailed. */
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 20 },
    // Never returned by default; select('+passwordHash') where a check needs it.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'customer', index: true },
    avatar: imageAssetSchema,
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    passwordChangedAt: Date,
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
  },
  baseSchemaOptions,
);

// Both are optional, so uniqueness only applies to accounts that have one.
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } },
);
userSchema.index(
  { passwordResetTokenHash: 1 },
  { partialFilterExpression: { passwordResetTokenHash: { $type: 'string' } } },
);
userSchema.index({ name: 'text', email: 'text', phone: 'text' });

export const UserModel: Model<User> = defineModel<User>('User', userSchema);
