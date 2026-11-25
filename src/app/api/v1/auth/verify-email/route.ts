import { body, handler, ok } from '@/server/http';
import { verifyEmail, verifyInput } from '@/server/services/auth';

export const POST = handler(async (req) => ok(await verifyEmail(await body(req, verifyInput))));
