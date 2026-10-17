import { describe, expect, it } from "vitest";

import { gameInputSchema, zodFieldErrors } from "./schema";

const valid = {
  title: "Lantern Circuit",
  developer: "Mira Holt",
  genre: "Puzzle",
  monthly_revenue_usd: 0,
  monthly_downloads: 0,
  average_rating: 4,
};

describe("gameInputSchema", () => {
  it("accepts a rating of exactly 4.0 and zero counts", () => {
    expect(gameInputSchema.parse(valid).average_rating).toBe(4);
  });

  it("rejects negative revenue, non-integers, and ratings outside one decimal", () => {
    const parsed = gameInputSchema.safeParse({
      ...valid,
      title: "  ",
      monthly_revenue_usd: -1,
      monthly_downloads: 1.5,
      average_rating: 4.25,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const fields = zodFieldErrors(parsed.error);
      expect(fields.title?.length).toBeGreaterThan(0);
      expect(fields.monthly_revenue_usd?.join(" ")).toMatch(/0 or greater/);
      expect(fields.monthly_downloads?.join(" ")).toMatch(/integer/);
      expect(fields.average_rating?.join(" ")).toMatch(/one decimal/);
    }
  });

  it("rejects a rating above 5", () => {
    const parsed = gameInputSchema.safeParse({ ...valid, average_rating: 5.1 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(zodFieldErrors(parsed.error).average_rating?.join(" ")).toMatch(/0 and 5/);
    }
  });
});
