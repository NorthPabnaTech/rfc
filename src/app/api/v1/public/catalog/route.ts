import { handler, ok } from '@/server/http';
import { publicCatalog } from '@/server/services/bootstrap';

export const GET = handler(async () => ok(await publicCatalog()));
