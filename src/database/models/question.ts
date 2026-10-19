import { type Model, Schema, type Types } from 'mongoose';

import { baseSchemaOptions, defineModel } from './shared';

export interface Question {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  user: Types.ObjectId;
  question: string;
  answer?: string;
  answeredAt?: Date;
  answeredBy?: Types.ObjectId | null;
  /** Admin can hide spam/irrelevant questions from the product page. */
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<Question>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true, trim: true, maxlength: 1000 },
    answer: { type: String, trim: true, maxlength: 2000 },
    answeredAt: Date,
    answeredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isHidden: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

questionSchema.index({ product: 1, createdAt: -1 });
questionSchema.index({ answeredAt: 1 });

export const QuestionModel: Model<Question> = defineModel<Question>('Question', questionSchema);
