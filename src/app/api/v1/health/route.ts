import { handler, ok } from '@/server/http';

export const GET = handler(async () => ok({ status: 'ok', time: new Date().toISOString() }));
