import { Schema, type Types } from 'mongoose';

/**
 * For a combo line: what the bundle contains, snapshotted so the admin knows
 * exactly which items to buy from which supplier, even if the combo changes.
 */
export interface OrderItemComponent {
  product: Types.ObjectId;
  name: string;
  /** Units of this product per one combo. */
  quantity: number;
  supplierName?: string;
  supplierProductUrl?: string;
}

/**
 * A line on an order. Stored embedded in the Order document (not its own
 * collection) so an order and its lines are always read and written
 * atomically. Every field is a snapshot taken when the order was placed —
 * later product edits or price changes never alter a past order.
 */
export interface OrderItem {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  name: string;
  slug: string;
  image?: string;
  sku?: string;
  /** Selected variation values, e.g. { Size: "M", Color: "Black" }. */
  variant: Record<string, string>;
  quantity: number;
  unitPrice: number;
  /** Supplier cost per unit at order time — used for profit reporting. */
  supplierPrice: number;
  lineTotal: number;
  /** Absent for combos (each component has its own supplier). */
  supplier?: Types.ObjectId | null;
  supplierName?: string;
  /** Where the admin buys this item from when fulfilling the order. */
  supplierProductUrl?: string;
  /** Present only for combo lines. */
  components: OrderItemComponent[];
}

const componentSchema = new Schema<OrderItemComponent>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    supplierName: String,
    supplierProductUrl: String,
  },
  { _id: false },
);

export const orderItemSchema = new Schema<OrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true },
  image: String,
  sku: String,
  variant: { type: Map, of: String, default: {} },
  quantity: { type: Number, required: true, min: 1, max: 999 },
  unitPrice: { type: Number, required: true, min: 0 },
  supplierPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
  supplierName: String,
  supplierProductUrl: String,
  components: { type: [componentSchema], default: [] },
});
