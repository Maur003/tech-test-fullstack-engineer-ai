import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "fs";
import path from "path";
import Database from "better-sqlite3";

import { DuplicateTitleError, hasDuplicateTitle } from "@/features/games/domain/titles";
import type { Game, GameInput } from "@/features/games/domain/types";

const SEED_FILE = path.join(process.cwd(), "data", "games.json");

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => T): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function gamesDbPath(): string {
  const override = process.env.GAMES_DATA_FILE?.trim();
  if (override) return path.resolve(override);
  return path.join(process.cwd(), "data", "games.sqlite");
}

function listRows(db: Database.Database): Game[] {
  return db
    .prepare(
      `SELECT id, title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating
       FROM games
       ORDER BY rowid`,
    )
    .all() as Game[];
}

const insertSql = `INSERT INTO games (
  id, title, developer, genre, monthly_revenue_usd, monthly_downloads, average_rating
) VALUES (
  @id, @title, @developer, @genre, @monthly_revenue_usd, @monthly_downloads, @average_rating
)`;

function isGame(value: unknown): value is Game {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.developer === "string" &&
    typeof row.genre === "string" &&
    typeof row.monthly_revenue_usd === "number" &&
    typeof row.monthly_downloads === "number" &&
    typeof row.average_rating === "number"
  );
}

function seedFromJson(db: Database.Database): void {
  if (!existsSync(SEED_FILE)) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(SEED_FILE, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    console.error(`Games seed file is corrupt (${SEED_FILE}): ${detail}`);
    throw new Error(`Games database is corrupt: ${SEED_FILE}`);
  }

  if (!Array.isArray(parsed) || !parsed.every(isGame)) {
    console.error(`Games seed file is corrupt (${SEED_FILE}): expected an array of games`);
    throw new Error(`Games database is corrupt: ${SEED_FILE}`);
  }

  const insert = db.prepare(insertSql);
  const writeSeed = db.transaction((rows: Game[]) => {
    for (const row of rows) insert.run(row);
  });
  writeSeed(parsed);
}

function withDb<T>(fn: (db: Database.Database) => T): T {
  const file = gamesDbPath();
  mkdirSync(path.dirname(file), { recursive: true });
  const isNew = !existsSync(file);
  let db: Database.Database;
  try {
    db = new Database(file);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid database";
    console.error(`Games database is corrupt (${file}): ${detail}`);
    throw new Error(`Games database is corrupt: ${file}`);
  }

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    db.close();
  };

  let seeded = false;
  try {
    db.pragma("busy_timeout = 5000");
    db.exec(`CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      developer TEXT NOT NULL,
      genre TEXT NOT NULL,
      monthly_revenue_usd INTEGER NOT NULL,
      monthly_downloads INTEGER NOT NULL,
      average_rating REAL NOT NULL
    )`);
    if (isNew && !process.env.GAMES_DATA_FILE?.trim()) {
      seedFromJson(db);
      seeded = true;
    }
    return fn(db);
  } catch (error) {
    if (isNew && !seeded) {
      close();
      unlinkSync(file);
    }
    throw error;
  } finally {
    close();
  }
}

export const gamesRepository = {
  list(): Promise<Game[]> {
    return enqueue(() => withDb((db) => listRows(db)));
  },

  get(id: string): Promise<Game | null> {
    return enqueue(() =>
      withDb((db) => listRows(db).find((game) => game.id === id) ?? null),
    );
  },

  create(input: GameInput): Promise<Game> {
    return enqueue(() =>
      withDb((db) => {
        const insert = db.prepare(insertSql);
        const createGame = db.transaction(() => {
          if (hasDuplicateTitle(listRows(db), input.title)) {
            throw new DuplicateTitleError();
          }
          const game: Game = { id: randomUUID(), ...input };
          insert.run(game);
          return game;
        });
        return createGame();
      }),
    );
  },

  update(id: string, input: GameInput): Promise<Game | null> {
    return enqueue(() =>
      withDb((db) => {
        const write = db.prepare(
          `UPDATE games
           SET title = @title,
               developer = @developer,
               genre = @genre,
               monthly_revenue_usd = @monthly_revenue_usd,
               monthly_downloads = @monthly_downloads,
               average_rating = @average_rating
           WHERE id = @id`,
        );
        const updateGame = db.transaction(() => {
          const games = listRows(db);
          if (!games.some((game) => game.id === id)) return null;
          if (hasDuplicateTitle(games, input.title, id)) {
            throw new DuplicateTitleError();
          }
          const game: Game = { id, ...input };
          write.run(game);
          return game;
        });
        return updateGame();
      }),
    );
  },

  delete(id: string): Promise<boolean> {
    return enqueue(() =>
      withDb((db) => {
        const result = db.prepare("DELETE FROM games WHERE id = ?").run(id);
        return result.changes > 0;
      }),
    );
  },
};
