import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, expect, it } from "vitest";

import { DuplicateTitleError } from "@/features/games/domain/titles";
import type { GameInput } from "@/features/games/domain/types";

import { gamesRepository } from "./repository";

const realFile = path.join(process.cwd(), "data", "games.json");
const previousDataFile = process.env.GAMES_DATA_FILE;

let dir = "";
let file = "";
let realBefore = "";

function input(title: string): GameInput {
  return {
    title,
    developer: "Test Studio",
    genre: "Puzzle",
    monthly_revenue_usd: 10,
    monthly_downloads: 20,
    average_rating: 4,
  };
}

beforeEach(async () => {
  realBefore = await readFile(realFile, "utf8");
  dir = await mkdtemp(path.join(tmpdir(), "games-repo-"));
  file = path.join(dir, "games.json");
  process.env.GAMES_DATA_FILE = file;
});

afterEach(async () => {
  if (previousDataFile === undefined) delete process.env.GAMES_DATA_FILE;
  else process.env.GAMES_DATA_FILE = previousDataFile;
  await rm(dir, { recursive: true, force: true });
  expect(await readFile(realFile, "utf8")).toBe(realBefore);
});

it("creates, reads, updates, and deletes a game in the temp file", async () => {
  expect(await gamesRepository.list()).toEqual([]);

  const created = await gamesRepository.create(input("Paper Boat"));
  expect(created.id).toEqual(expect.any(String));
  expect(await gamesRepository.list()).toEqual([created]);
  expect(await gamesRepository.get(created.id)).toEqual(created);
  expect(await gamesRepository.get("missing")).toBeNull();

  const updated = await gamesRepository.update(created.id, input("Paper Boat II"));
  expect(updated).toMatchObject({ id: created.id, title: "Paper Boat II" });
  expect(await gamesRepository.update("missing", input("Nope"))).toBeNull();

  expect(await gamesRepository.delete(created.id)).toBe(true);
  expect(await gamesRepository.get(created.id)).toBeNull();
  expect(await gamesRepository.delete(created.id)).toBe(false);
});

it("rejects a duplicate title without writing a second row", async () => {
  await gamesRepository.create(input("Lantern"));
  await expect(gamesRepository.create(input(" lantern "))).rejects.toBeInstanceOf(
    DuplicateTitleError,
  );
  const games = await gamesRepository.list();
  expect(games).toHaveLength(1);
  expect(games[0]?.title).toBe("Lantern");
});

it("keeps all 60 parallel creates in one valid JSON file", async () => {
  await Promise.all(
    Array.from({ length: 60 }, (_, index) => gamesRepository.create(input(`Parallel ${index}`))),
  );

  const raw = await readFile(file, "utf8");
  const parsed = JSON.parse(raw) as Array<{ id: string; title: string }>;
  expect(Array.isArray(parsed)).toBe(true);
  expect(parsed).toHaveLength(60);
  expect(new Set(parsed.map((game) => game.id)).size).toBe(60);
  expect(new Set(parsed.map((game) => game.title)).size).toBe(60);
});
