import { body, handler, ok } from '@/server/http';
import { register, registerInput } from '@/server/services/auth';

export const POST = handler(async (req) => ok(await register(await body(req, registerInput)), 201));
