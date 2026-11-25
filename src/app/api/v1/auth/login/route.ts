import { body, handler, ok } from '@/server/http';
import { login, loginInput } from '@/server/services/auth';

export const POST = handler(async (req) => ok(await login(await body(req, loginInput))));
