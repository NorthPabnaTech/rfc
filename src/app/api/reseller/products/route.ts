import { NextRequest } from 'next/server';

import { listResellerCatalog } from '@/services/resellers';
import {
  getOptionalReseller,
  resellerError,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function GET(req: NextRequest) {
  try {
    const reseller = await getOptionalReseller(req);
    const sp = req.nextUrl.searchParams;
    const data = await listResellerCatalog(
      {
        q: sp.get('q') ?? undefined,
        category: sp.get('category') ?? undefined,
        page: sp.get('page') ? Number(sp.get('page')) : 1,
        limit: sp.get('limit') ? Number(sp.get('limit')) : 20,
      },
      Boolean(reseller),
    );

    return resellerJson({
      ok: true,
      authenticated: Boolean(reseller),
      data,
    });
  } catch {
    return resellerError('Failed to load reseller products.', 500);
  }
}
