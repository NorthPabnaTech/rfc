import { NextRequest } from 'next/server';

import { listResellerTransactions } from '@/services/resellers';
import {
  requireReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';
import type { WalletTxStatus, WalletTxType } from '@lib/constants';

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;

  try {
    const sp = req.nextUrl.searchParams;
    const data = await listResellerTransactions(String(auth.reseller._id), {
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      limit: sp.get('limit') ? Number(sp.get('limit')) : 20,
      type: (sp.get('type') as WalletTxType) || undefined,
      status: (sp.get('status') as WalletTxStatus) || undefined,
    });
    return resellerJson({ ok: true, data });
  } catch {
    return resellerError('Failed to load wallet transactions.', 500);
  }
}
