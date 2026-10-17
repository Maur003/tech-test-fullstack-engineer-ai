export const GAMES_MAX_BODY_BYTES = 10 * 1024;
export const CHAT_MAX_BODY_BYTES = 64 * 1024;

export function bodyTooLarge(request: Request, limit: number): boolean {
  const raw = request.headers.get("content-length");
  if (raw == null || raw.trim() === "") return false;
  const length = Number(raw);
  return Number.isFinite(length) && length > limit;
}

export function apiError(
  status: number,
  message: string,
  fields?: Record<string, string[]>,
): Response {
  if (fields) {
    return Response.json({ error: message, fields }, { status });
  }
  return Response.json({ error: message }, { status });
}

export function unexpectedError(error: unknown): Response {
  console.error(error);
  return apiError(500, "Something went wrong");
}
