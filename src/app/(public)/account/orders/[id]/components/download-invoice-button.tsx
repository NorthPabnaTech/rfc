'use client';

import type { BusinessDTO, OrderDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { downloadOrderInvoicePdf } from '@lib/invoice-pdf';

export function DownloadInvoiceButton({
  order,
  business,
}: {
  order: OrderDTO;
  business?: BusinessDTO;
}) {
  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      onClick={() => {
        void downloadOrderInvoicePdf(order, {
          name: business?.name,
          address: business?.address,
          phone: business?.phone,
          logoUrl: business?.logo?.url,
        });
      }}
    >
      <Icon name="download" size={14} /> Download invoice
    </Button>
  );
}
