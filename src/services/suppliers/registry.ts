import 'server-only';

import type { Supplier } from '@/database';
import type { SupplierProvider } from '@lib/constants';
import { AppError } from '@lib/errors';

import { BusinessKoroAdapter } from './business-koro';
import type { SupplierAdapter } from './types';

const ADAPTERS: Record<SupplierProvider, SupplierAdapter> = {
  business_koro: BusinessKoroAdapter,
};

export function getSupplierAdapter(provider?: SupplierProvider | null): SupplierAdapter {
  if (!provider || !(provider in ADAPTERS)) {
    throw new AppError('This supplier does not have an active API adapter configured.', 400);
  }
  return ADAPTERS[provider];
}

export function isSupplierApiConfigured(supplier: Pick<Supplier, 'type' | 'provider' | 'apiKeyEnvVar'>): boolean {
  if (supplier.type !== 'api' || !supplier.provider) return false;
  const adapter = ADAPTERS[supplier.provider];
  return adapter ? adapter.isConfigured(supplier) : false;
}
