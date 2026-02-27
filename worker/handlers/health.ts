import { getCorsHeaders, type Env } from '../middleware/cors.js';

export function handleHealth(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin');
  return Response.json(
    { ok: true, data: { status: 'healthy', timestamp: Date.now() } },
    { headers: getCorsHeaders(origin, env) },
  );
}
