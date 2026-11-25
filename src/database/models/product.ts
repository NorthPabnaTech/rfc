import { type Model, Schema, type Types } from 'mongoose';

import {
  DEFAULT_BUSINESS_SLUG,
  PRODUCT_DELIVERY_DISCOUNT_TYPES,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  PRODUCT_VISIBILITIES,
  type ProductDeliveryDiscountType,
  type ProductStatus,
  type ProductType,
  type ProductVisibility,
  STOCK_STATUSES,
  type StockStatus,
} from '@lib/constants';

import { baseSchemaOptions, defineModel, type ImageAsset, imageAssetSchema } from './shared';

/** A customer-selectable option, e.g. { name: "Size", values: ["S","M","L"] }. */
export interface ProductVariation {
  name: string;
  values: string[];
  disabledValues?: string[];
}

export interface ProductSpecification {
  label: string;
  value: string;
}

/** One product inside a combo, with how many of it the bundle contains. */
export interface ComboItem {
  product: Types.ObjectId;
  quantity: number;
}

export interface ProductSeo {
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
}

export interface Product {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  shortDescription?: string;
  /** Sanitized HTML from the admin rich-text editor. */
  description?: string;
  /** `single` = a normal product; `combo` = a bundle of `comboItems`. */
  type: ProductType;
  comboItems: ComboItem[];
  /** Required for single products; combos may be uncategorized. */
  category?: Types.ObjectId | null;
  subCategory?: Types.ObjectId | null;
  tags: Types.ObjectId[];

  /** Required for single products; a combo's suppliers come from its items. */
  supplier?: Types.ObjectId | null;
  supplierProductUrl?: string;
  /** External product ID when imported from an API-connected supplier (admin-only). */
  supplierProductId?: string;
  supplierPackagingCost?: number;
  supplierMinSellingPrice?: {
    customerPaysDelivery: number;
    resellerPaysDeliveryInsideDhaka: number;
    resellerPaysDeliveryOutsideDhaka: number;
  };
  supplierDeliveryCharges?: { insideDhaka: number; outsideDhaka: number };
  supplierInStock?: boolean;
  supplierLastSyncedAt?: Date;
  supplierVariants?: {
    externalVariantId: string;
    color?: string | null;
    size?: string | null;
    stockQuantity: number;
    inStock: boolean;
  }[];
  /** What we pay the supplier (for combos: the items' total) — admin-only. */
  supplierPrice: number;
  /** Whether this product is exposed in the external Reseller API. */
  resellerEnabled: boolean;
  /** Admin profit margin (Tk) added on top of supplierPrice for resellers. */
  resellerProfit: number;
  /** Optional packaging cost charged to resellers (falls back to supplierPackagingCost). */
  resellerPackagingCost?: number;
  /** Regular selling price. */
  price: number;
  /** Optional discounted price; must be lower than `price` to take effect. */
  salePrice?: number | null;
  /** Denormalized `salePrice ?? price`, kept for price filtering and sorting. */
  effectivePrice: number;

  stockStatus: StockStatus;
  stockQuantity: number;
  /** True once numeric stock is actively managed (e.g. via Stock In/Out). */
  trackInventory: boolean;
  sku?: string;
  images: ImageAsset[];
  variations: ProductVariation[];
  specifications: ProductSpecification[];
  seo: ProductSeo;

  business: string;
  visibility: ProductVisibility;
  status: ProductStatus;
  isFeatured: boolean;
  /** A regular product (e.g. "5 pcs T-shirt combo") also listed under Combo offers. */
  isComboOffer: boolean;
  /** When true, customer gets free delivery and the delivery charge is borne by the reseller. */
  freeDelivery: boolean;
  deliveryDiscountType: ProductDeliveryDiscountType;
  deliveryDiscountValue: number;
  soldCount: number;
  ratingAverage: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const variationSchema = new Schema<ProductVariation>(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    values: [{ type: String, trim: true, maxlength: 60 }],
    disabledValues: [{ type: String, trim: true, maxlength: 60 }],
  },
  { _id: false },
);

const specificationSchema = new Schema<ProductSpecification>(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    value: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const comboItemSchema = new Schema<ComboItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, max: 20 },
  },
  { _id: false },
);

const productSchema = new Schema<Product>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    shortDescription: { type: String, trim: true, maxlength: 500 },
    description: { type: String, maxlength: 50_000 },
    type: { type: String, enum: PRODUCT_TYPES, default: 'single', index: true },
    comboItems: { type: [comboItemSchema], default: [] },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    subCategory: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag', index: true }],

    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null, index: true },
    supplierProductUrl: { type: String, trim: true, maxlength: 1000 },
    supplierProductId: { type: String, trim: true, maxlength: 120, index: true, sparse: true },
    supplierPackagingCost: { type: Number, min: 0 },
    supplierMinSellingPrice: {
      customerPaysDelivery: { type: Number, min: 0 },
      resellerPaysDeliveryInsideDhaka: { type: Number, min: 0 },
      resellerPaysDeliveryOutsideDhaka: { type: Number, min: 0 },
    },
    supplierDeliveryCharges: {
      insideDhaka: { type: Number, min: 0 },
      outsideDhaka: { type: Number, min: 0 },
    },
    supplierInStock: { type: Boolean },
    supplierLastSyncedAt: Date,
    supplierVariants: {
      type: [
        new Schema(
          {
            externalVariantId: { type: String, required: true, trim: true },
            color: { type: String, trim: true, default: null },
            size: { type: String, trim: true, default: null },
            stockQuantity: { type: Number, default: 0, min: 0 },
            inStock: { type: Boolean, default: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    supplierPrice: { type: Number, required: true, min: 0 },
    resellerEnabled: { type: Boolean, default: false, index: true },
    resellerProfit: { type: Number, default: 50, min: 0 },
    resellerPackagingCost: { type: Number, min: 0 },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0, default: null },
    effectivePrice: { type: Number, required: true, min: 0, index: true },

    stockStatus: { type: String, enum: STOCK_STATUSES, default: 'in_stock', index: true },
    stockQuantity: { type: Number, default: 0, min: 0 },
    trackInventory: { type: Boolean, default: false },
    sku: { type: String, trim: true, uppercase: true, maxlength: 60 },
    images: { type: [imageAssetSchema], default: [] },
    variations: { type: [variationSchema], default: [] },
    specifications: { type: [specificationSchema], default: [] },
    seo: {
      metaTitle: { type: String, trim: true, maxlength: 120 },
      metaDescription: { type: String, trim: true, maxlength: 320 },
      keywords: [{ type: String, trim: true, maxlength: 60 }],
    },

    business: { type: String, default: DEFAULT_BUSINESS_SLUG, index: true },
    visibility: { type: String, enum: PRODUCT_VISIBILITIES, default: 'public', index: true },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'published', index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isComboOffer: { type: Boolean, default: false, index: true },
    freeDelivery: { type: Boolean, default: false },
    deliveryDiscountType: {
      type: String,
      enum: PRODUCT_DELIVERY_DISCOUNT_TYPES,
      default: 'none',
    },
    deliveryDiscountValue: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0 },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

productSchema.index({ slug: 1 }, { unique: true });
// SKU is optional, so only enforce uniqueness where one is set.
productSchema.index(
  { sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } },
);
productSchema.index(
  { name: 'text', shortDescription: 'text', 'seo.keywords': 'text' },
  { weights: { name: 10, 'seo.keywords': 4, shortDescription: 2 }, name: 'product_text' },
);
productSchema.index({ status: 1, createdAt: -1 });

productSchema.pre('validate', function () {
  if (this.type !== 'combo' && (!this.category || !this.supplier)) {
    this.invalidate(this.category ? 'supplier' : 'category', 'Required for single products');
  }
  const hasSale = this.salePrice != null && this.salePrice > 0 && this.salePrice < this.price;
  if (!hasSale) this.salePrice = null;
  this.effectivePrice = hasSale ? (this.salePrice as number) : this.price;
});

export const ProductModel: Model<Product> = defineModel<Product>('Product', productSchema);
