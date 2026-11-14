import type { Supplier } from '@/database';
import type { SupplierCatalogProductDTO } from '@/types';
import type { SupplierOrderStatus, SupplierProvider } from '@lib/constants';

export type SupplierOrderSubmitPayload = {
  productId: string;
  variantId?: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerDivision: string;
  customerDistrict: string;
  customerArea: string;
  sellingPrice: number;
  deliveryChargePaidByCustomer: boolean;
  deliveryChargePaidUpfront?: boolean;
  customerNote?: string;
  allowDuplicate?: boolean;
};

export type SupplierOrderSubmitResult = {
  externalOrderId?: string;
  status: SupplierOrderStatus;
  externalStatus?: string;
  paymentStatus?: string;
  isDuplicate: boolean;
  message?: string;
  rawSummary: Record<string, unknown>;
};

export type SupplierOrderStatusResult = {
  externalOrderId: string;
  status: SupplierOrderStatus;
  externalStatus?: string;
  paymentStatus?: string;
  rawSummary: Record<string, unknown>;
};

export type SupplierProductsPage = {
  products: SupplierCatalogProductDTO[];
  total: number;
  page: number;
  totalPages: number;
  deliveryCharges?: { insideDhaka: number; outsideDhaka: number };
};

export interface SupplierAdapter {
  readonly provider: SupplierProvider;
  isConfigured(supplier: Pick<Supplier, 'apiKeyEnvVar'>): boolean;
  fetchProducts(
    supplier: Supplier,
    opts?: { search?: string; page?: number; limit?: number },
  ): Promise<SupplierProductsPage>;
  fetchAllProducts(supplier: Supplier): Promise<{
    products: SupplierCatalogProductDTO[];
    deliveryCharges?: { insideDhaka: number; outsideDhaka: number };
  }>;
  submitOrder(
    supplier: Supplier,
    payload: SupplierOrderSubmitPayload,
  ): Promise<SupplierOrderSubmitResult>;
  getOrderStatus(
    supplier: Supplier,
    externalOrderId: string,
  ): Promise<SupplierOrderStatusResult>;
}
