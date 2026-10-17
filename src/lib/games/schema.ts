import { ZodError, z } from "zod";

import type { GameInput } from "./types";

const oneDecimal = (value: number) =>
  Math.abs(value * 10 - Math.round(value * 10)) < 1e-6;

export const gameInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  developer: z.string().trim().min(1, "Developer is required"),
  genre: z.string().trim().min(1, "Genre is required"),
  monthly_revenue_usd: z
    .number({ invalid_type_error: "Revenue must be an integer" })
    .int("Revenue must be an integer")
    .min(0, "Revenue must be 0 or greater"),
  monthly_downloads: z
    .number({ invalid_type_error: "Downloads must be an integer" })
    .int("Downloads must be an integer")
    .min(0, "Downloads must be 0 or greater"),
  average_rating: z
    .number({ invalid_type_error: "Rating must be a number" })
    .min(0, "Rating must be between 0 and 5")
    .max(5, "Rating must be between 0 and 5")
    .refine(oneDecimal, "Rating must have at most one decimal place"),
});

export function zodFieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(error.flatten().fieldErrors)) {
    if (messages && messages.length > 0) {
      fields[key] = messages;
    }
  }
  return fields;
}

export function parseGameInput(
  body: unknown,
): { ok: true; data: GameInput } | { ok: false; fields: Record<string, string[]> } {
  const parsed = gameInputSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, fields: zodFieldErrors(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}
