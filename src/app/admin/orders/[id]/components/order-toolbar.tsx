'use client';

import * as React from 'react';

import type { BusinessDTO, OrderDTO } from '@/types';
import { Icon } from '@components/icon/icon';
import { Button } from '@components/ui/button';
import { downloadOrderInvoicePdf } from '@lib/invoice-pdf';
import { toast } from '@lib/toast';

export function OrderToolbar({
  order,
  business,
}: {
  order: OrderDTO;
  business?: BusinessDTO | null;
}) {
  const [copied, setCopied] = React.useState(false);

  const copyTrackingLink = async () => {
    const url = `${window.location.origin}/track-order?orderNumber=${encodeURIComponent(
      order.orderNumber,
    )}&phone=${encodeURIComponent(order.customer.phone)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Tracking link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={copyTrackingLink}
      >
        <Icon name={copied ? 'check' : 'link'} size={14} />
        {copied ? 'Copied!' : 'Copy tracking link'}
      </Button>
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
    </div>
  );
}
