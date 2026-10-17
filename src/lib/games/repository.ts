import { randomUUID } from "crypto";
import { readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";

import type { Game, GameInput } from "./types";

const dataFile = path.join(process.cwd(), "data", "games.json");

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
  const raw = await readFile(dataFile, "utf8");
  return JSON.parse(raw) as Game[];
}

async function writeGames(games: Game[]): Promise<void> {
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
