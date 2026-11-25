'use client';

import * as React from 'react';

import type { FraudCheckReport } from '@/services/fraud-checker';
import { Icon } from '@components/icon/icon';
import { Callout } from '@components/shared';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Input } from '@components/ui/input';
import { authHeaders } from '@lib/api/client';

import { FraudReportView } from './fraud-report-view';

function validateAndNormalizePhone(raw: string): { ok: true; phone: string } | { ok: false; error: string } {
  const cleaned = raw.trim().replace(/[\s-]/g, '').replace(/^\+?88/, '');
  if (!/^01[3-9]\d{8}$/.test(cleaned)) {
    return {
      ok: false,
      error: 'Enter a valid 11-digit Bangladeshi mobile number (e.g. 01XXXXXXXXX).',
    };
  }
  return { ok: true, phone: cleaned };
}

export function CourierHistoryModal({
  open,
  onOpenChange,
  fixedPhone,
  endpoint = '/api/admin/fraud-check',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided (Order Details), automatically checks this number on open without manual input. */
  fixedPhone?: string;
  endpoint?: string;
}) {
  const isAutoMode = Boolean(fixedPhone);
  const [phoneInput, setPhoneInput] = React.useState(fixedPhone ?? '');
  const [inputError, setInputError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<FraudCheckReport | null>(null);
  const inFlightRef = React.useRef(false);

  const runCheck = React.useCallback(async (rawPhone: string) => {
    if (inFlightRef.current) return;

    const validated = validateAndNormalizePhone(rawPhone);
    if (!validated.ok) {
      setInputError(validated.error);
      return;
    }

    setInputError(null);
    setApiError(null);
    setLoading(true);
    inFlightRef.current = true;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ phone: validated.phone }),
      });

      const payload = (await res.json().catch(() => null)) as
        | { ok: true; data: FraudCheckReport }
        | { ok: false; error?: string }
        | null;

      if (!res.ok || !payload || !payload.ok) {
        setApiError(
          (payload && !payload.ok && payload.error) ||
            `Failed to check courier history (HTTP ${res.status}).`,
        );
        return;
      }

      setReport(payload.data);
    } catch {
      setApiError('Network error while checking courier history. Please try again.');
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [endpoint]);

  // Auto-fetch when opened in Order Details mode.
  React.useEffect(() => {
    if (!open || !fixedPhone) return;
    setReport(null);
    setApiError(null);
    setInputError(null);
    const timer = setTimeout(() => {
      void runCheck(fixedPhone);
    }, 0);
    return () => clearTimeout(timer);
  }, [open, fixedPhone, runCheck]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runCheck(phoneInput);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Courier History &amp; Fraud Check</DialogTitle>
          <DialogDescription>
            {isAutoMode
              ? `Delivery success rate and fraud report for ${fixedPhone}.`
              : 'Enter a Bangladeshi mobile number to check multi-courier delivery history.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {!isAutoMode && (
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  aria-label="Customer mobile number"
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  placeholder="01XXXXXXXXX (or +8801XXXXXXXXX)"
                  inputMode="tel"
                  disabled={loading}
                  className="flex-1"
                />
                <Button type="submit" variant="primary" size="md" disabled={loading || !phoneInput.trim()}>
                  <Icon name="search" size={15} />
                  {loading ? 'Checking…' : 'Check'}
                </Button>
              </div>
              {inputError && <p className="text-danger text-xs font-medium">{inputError}</p>}
            </form>
          )}

          {isAutoMode && inputError && (
            <Callout tone="warn" title="Invalid customer phone number" description={inputError} />
          )}

          {loading && (
            <div className="border-line bg-well flex flex-col items-center justify-center gap-2 rounded-xl border py-10 text-center">
              <Icon name="refresh" size={22} className="text-accent animate-spin" />
              <p className="text-ink text-sm font-medium">Checking courier history…</p>
              <p className="text-subtle text-xs">
                Fetching Steadfast, Pathao, RedX, CarryBee &amp; Paperfly records
              </p>
            </div>
          )}

          {!loading && apiError && (
            <Callout tone="danger" title="Could not retrieve courier history">
              <p>{apiError}</p>
              <div className="mt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void runCheck(fixedPhone ?? phoneInput)}
                >
                  <Icon name="refresh" size={14} /> Retry
                </Button>
              </div>
            </Callout>
          )}

          {!loading && !apiError && report && <FraudReportView report={report} />}
        </DialogBody>

        <DialogFooter>
          {!loading && report && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void runCheck(fixedPhone ?? phoneInput)}
            >
              <Icon name="refresh" size={14} /> Re-check
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
