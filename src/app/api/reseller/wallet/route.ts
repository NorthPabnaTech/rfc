import { NextRequest } from 'next/server';

import {
  requireReseller,
  resellerJson,
  resellerOptionsResponse,
} from '@lib/auth/reseller-auth';
import { MIN_RESELLER_DEPOSIT, MIN_RESELLER_WITHDRAWAL } from '@lib/constants';

export function OPTIONS() {
  return resellerOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await requireReseller(req);
  if (auth.error) return auth.error;
  const r = auth.reseller;

  return resellerJson({
    ok: true,
    data: {
      walletBalance: r.walletBalance,
      totalDeposited: r.totalDeposited,
      totalWithdrawn: r.totalWithdrawn,
      totalProfitEarned: r.totalProfitEarned,
      minDeposit: MIN_RESELLER_DEPOSIT,
      minWithdrawal: MIN_RESELLER_WITHDRAWAL,
    },
  });
}
