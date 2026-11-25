import { handler, ok } from '@/server/http';
import { currentUser } from '@/server/session';

export const GET = handler(async () => ok(await currentUser()));
