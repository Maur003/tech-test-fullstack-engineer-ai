/**
 * Demo-grade in-memory limiter. It lives in this Node process only:
 * a restart clears it, and another instance does not share the counts.
 */

const WINDOW_MS = 60_000;
const LIMIT = 20;

const hits = new Map<string, number[]>();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "local";
}

export function consumeChatRateLimit(ip: string, now: number): RateLimitResult {
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= LIMIT) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((recent[0] + WINDOW_MS - now) / 1000),
    );
    hits.set(ip, recent);
    return { allowed: false, retryAfterSeconds };
  }
  recent.push(now);
  hits.set(ip, recent);
  return { allowed: true };
}

export function resetChatRateLimit(): void {
  hits.clear();
}
