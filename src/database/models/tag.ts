import { type Model, Schema, type Types } from 'mongoose';

import { baseSchemaOptions, defineModel } from './shared';

export interface Tag {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<Tag>(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    slug: { type: String, required: true, trim: true, lowercase: true },
  },
  baseSchemaOptions,
);

tagSchema.index({ slug: 1 }, { unique: true });

export const TagModel: Model<Tag> = defineModel<Tag>('Tag', tagSchema);
