/**
 * Convierte valores tipo JWT_EXPIRATION (`24h`, `15m`, `7d`) a milisegundos para maxAge de cookie.
 */
export function jwtExpirationToMs(exp: string | undefined): number {
  const v = (exp ?? '24h').trim();
  const m = /^(\d+)(ms|s|m|h|d)$/i.exec(v);
  if (!m) return 24 * 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  const mult: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * (mult[u] ?? 3_600_000);
}
