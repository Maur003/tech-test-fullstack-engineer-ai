import { randomUUID } from "crypto";
import { readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";

import { DuplicateTitleError, hasDuplicateTitle } from "./titles";
import type { Game, GameInput } from "./types";

function gamesDataPath(): string {
  const override = process.env.GAMES_DATA_FILE?.trim();
  if (override) return path.resolve(override);
  return path.join(process.cwd(), "data", "games.json");
}

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readGames(): Promise<Game[]> {
  const dataFile = gamesDataPath();
  let raw: string;
  try {
    raw = await readFile(dataFile, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("expected a JSON array");
    }
    return parsed as Game[];
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    console.error(`Games data file is corrupt (${dataFile}): ${detail}`);
    throw new Error(`Games data file is corrupt: ${dataFile}`);
  }
}

async function writeGames(games: Game[]): Promise<void> {
  const dataFile = gamesDataPath();
  const tmp = `${dataFile}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(games, null, 2)}\n`, "utf8");
  try {
    await rename(tmp, dataFile);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST" || code === "EPERM") {
      await unlink(dataFile);
      await rename(tmp, dataFile);
      return;
    }
    await unlink(tmp).catch(() => undefined);
    throw error;
  }
}

export const gamesRepository = {
  list(): Promise<Game[]> {
    return enqueue(() => readGames());
  },

  get(id: string): Promise<Game | null> {
    return enqueue(async () => {
      const games = await readGames();
      return games.find((game) => game.id === id) ?? null;
    });
  },

  create(input: GameInput): Promise<Game> {
    return enqueue(async () => {
      const games = await readGames();
      if (hasDuplicateTitle(games, input.title)) {
        throw new DuplicateTitleError();
      }
      const game: Game = { id: randomUUID(), ...input };
      games.push(game);
      await writeGames(games);
      return game;
    });
  },

  update(id: string, input: GameInput): Promise<Game | null> {
    return enqueue(async () => {
      const games = await readGames();
      const index = games.findIndex((game) => game.id === id);
      if (index === -1) return null;
      if (hasDuplicateTitle(games, input.title, id)) {
        throw new DuplicateTitleError();
      }
      const game: Game = { id, ...input };
      games[index] = game;
      await writeGames(games);
      return game;
    });
  },

  delete(id: string): Promise<boolean> {
    return enqueue(async () => {
      const games = await readGames();
      const next = games.filter((game) => game.id !== id);
      if (next.length === games.length) return false;
      await writeGames(next);
      return true;
    });
  },
};
