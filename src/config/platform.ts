/**
 * Reseller platform configuration.
 *
 * Phase 1 (frontend only): every value below is a placeholder read from public
 * environment variables. Nothing here talks to a server yet — the UI reads from
 * the mock data layer (`src/mock`, `src/stores/platform-store.ts`). In Phase 2
 * the API client (`src/lib/api/client.ts`) uses `apiUrl` to reach the backend.
 *
 * Never invent real Telegram links: when a link is not configured the UI shows
 * a "not configured yet" state instead of a fake URL.
 */
export const PLATFORM = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'RFC Hub',
  tagline: 'Start reselling without inventory',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
  telegram: {
    support: process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT || '',
    group: process.env.NEXT_PUBLIC_TELEGRAM_GROUP || '',
  },
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
} as const;

/** True when a real API base URL is configured (Phase 2 switch). */
export const HAS_API = PLATFORM.apiUrl.length > 0;
