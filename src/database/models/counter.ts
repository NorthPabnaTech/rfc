import { type Model, Schema } from 'mongoose';

import { defineModel } from './shared';

/** Atomic sequence generator (used for sequential order numbers). */
interface Counter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<Counter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const CounterModel: Model<Counter> = defineModel<Counter>('Counter', counterSchema);

/** Returns `offset + n` where n is 1, 2, 3… for successive calls per `name`. */
export async function nextSequence(name: string, offset = 100000): Promise<number> {
  const doc = await CounterModel.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  return offset + (doc?.seq ?? 1);
}
