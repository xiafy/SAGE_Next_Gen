/** CORS 中间件 */

export interface Env {
  BAILIAN_API_KEY: string;
  ALLOWED_ORIGINS?: string;
}

const DEFAULT_ALLOWED = new Set([
  'https://sage-next-gen.pages.dev',
  'http://localhost:5173',
  'http://localhost:4173',
]);

function getAllowed(env: Env): Set<string> {
  if (!env.ALLOWED_ORIGINS) return DEFAULT_ALLOWED;
  return new Set(env.ALLOWED_ORIGINS.split(',').map(s => s.trim()));
}

export function getCorsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = getAllowed(env);
  const allowedOrigin = origin && allowed.has(origin) ? origin : '';

  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age':       '86400',
  };
}

export function handleOptions(request: Request, env: Env): Response | null {
  if (request.method !== 'OPTIONS') return null;

  const origin = request.headers.get('Origin');
  const allowed = getAllowed(env);

  if (!origin || !allowed.has(origin)) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin, env),
  });
}
