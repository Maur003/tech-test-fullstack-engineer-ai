import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "fs";
import path from "path";
import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

import { DuplicateTitleError, hasDuplicateTitle } from "@/features/games/domain/titles";
import type { Game, GameInput } from "@/features/games/domain/types";

const SEED_FILE = path.join(process.cwd(), "data", "games.json");

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
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

function sqliteUrl(file: string): string {
  return `file:${file.replace(/\\/g, "/")}`;
}

function asGame(row: {
  id: string;
  title: string;
  developer: string;
  genre: string;
  monthly_revenue_usd: number | bigint;
  monthly_downloads: number | bigint;
  average_rating: number;
}): Game {
  return {
    id: row.id,
    title: row.title,
    developer: row.developer,
    genre: row.genre,
    monthly_revenue_usd: Number(row.monthly_revenue_usd),
    monthly_downloads: Number(row.monthly_downloads),
    average_rating: Number(row.average_rating),
  };
}

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

function isCorruptDatabase(error: unknown): boolean {
  const parts = [error instanceof Error ? error.message : String(error)];
  if (error instanceof Error && error.cause instanceof Error) {
    parts.push(error.cause.message);
  }
  return /not a database|SQLITE_NOTADB|malformed|file is encrypted/i.test(parts.join(" "));
}

async function seedFromJson(prisma: PrismaClient): Promise<void> {
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

  await prisma.game.createMany({ data: parsed });
}

async function withPrisma<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  const file = gamesDbPath();
  mkdirSync(path.dirname(file), { recursive: true });
  const isNew = !existsSync(file);
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSQLite3({ url: sqliteUrl(file) }),
  });

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await prisma.$disconnect();
  };

  let seeded = false;
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS games (
      id TEXT NOT NULL PRIMARY KEY,
      title TEXT NOT NULL,
      developer TEXT NOT NULL,
      genre TEXT NOT NULL,
      monthly_revenue_usd INTEGER NOT NULL,
      monthly_downloads INTEGER NOT NULL,
      average_rating REAL NOT NULL
    )`);
    if (isNew && !process.env.GAMES_DATA_FILE?.trim()) {
      await seedFromJson(prisma);
      seeded = true;
    }
    return await fn(prisma);
  } catch (error) {
    await close();
    if (isNew && !seeded) {
      try {
        unlinkSync(file);
      } catch {
        // The file may already be gone.
      }
    }
    if (error instanceof DuplicateTitleError) throw error;
    if (isCorruptDatabase(error)) {
      const detail = error instanceof Error ? error.message : "invalid database";
      console.error(`Games database is corrupt (${file}): ${detail}`);
      throw new Error(`Games database is corrupt: ${file}`);
    }
    throw error;
  } finally {
    await close();
  }
}

export const gamesRepository = {
  list(): Promise<Game[]> {
    return enqueue(() =>
      withPrisma(async (prisma) => {
        const rows = await prisma.game.findMany();
        return rows.map(asGame);
      }),
    );
  },

  get(id: string): Promise<Game | null> {
    return enqueue(() =>
      withPrisma(async (prisma) => {
        const row = await prisma.game.findUnique({ where: { id } });
        return row ? asGame(row) : null;
      }),
    );
  },

  create(input: GameInput): Promise<Game> {
    return enqueue(() =>
      withPrisma((prisma) =>
        prisma.$transaction(async (tx) => {
          const rows = (await tx.game.findMany()).map(asGame);
          if (hasDuplicateTitle(rows, input.title)) {
            throw new DuplicateTitleError();
          }
          const game: Game = { id: randomUUID(), ...input };
          await tx.game.create({ data: game });
          return game;
        }),
      ),
    );
  },

  update(id: string, input: GameInput): Promise<Game | null> {
    return enqueue(() =>
      withPrisma((prisma) =>
        prisma.$transaction(async (tx) => {
          const existing = await tx.game.findUnique({ where: { id } });
          if (!existing) return null;
          const rows = (await tx.game.findMany()).map(asGame);
          if (hasDuplicateTitle(rows, input.title, id)) {
            throw new DuplicateTitleError();
          }
          const game: Game = { id, ...input };
          await tx.game.update({ where: { id }, data: input });
          return game;
        }),
      ),
    );
  },

  delete(id: string): Promise<boolean> {
    return enqueue(() =>
      withPrisma(async (prisma) => {
        const result = await prisma.game.deleteMany({ where: { id } });
        return result.count > 0;
      }),
    );
  },
};
