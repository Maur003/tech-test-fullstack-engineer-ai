import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { GAMES_MAX_BODY_BYTES } from "@/lib/http/api-error";

import { DELETE, GET, PUT } from "./[id]/route";
import { GET as listGames, POST } from "./route";

const realFile = path.join(process.cwd(), "data", "games.json");
const previousDataFile = process.env.GAMES_DATA_FILE;

let dir = "";
let file = "";
let realBefore = "";

const game = {
  title: "Route Probe",
  developer: "Test Studio",
  genre: "Puzzle",
  monthly_revenue_usd: 12,
  monthly_downloads: 34,
  average_rating: 4.5,
};

function request(url: string, init?: RequestInit) {
  return new Request(url, init);
}

beforeEach(async () => {
  realBefore = await readFile(realFile, "utf8");
  dir = await mkdtemp(path.join(tmpdir(), "games-routes-"));
  file = path.join(dir, "games.sqlite");
  process.env.GAMES_DATA_FILE = file;
});

afterEach(async () => {
  if (previousDataFile === undefined) delete process.env.GAMES_DATA_FILE;
  else process.env.GAMES_DATA_FILE = previousDataFile;
  await rm(dir, { recursive: true, force: true });
  expect(await readFile(realFile, "utf8")).toBe(realBefore);
});

it("creates, reads, updates, and deletes a game", async () => {
  const createdResponse = await POST(
    request("http://localhost/api/games", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(game),
    }),
  );
  expect(createdResponse.status).toBe(201);
  const created = (await createdResponse.json()) as { id: string; title: string };
  expect(created.title).toBe("Route Probe");

  const listed = await listGames();
  expect(listed.status).toBe(200);
  expect(await listed.json()).toEqual([created]);

  const one = await GET(request("http://localhost/api/games/" + created.id), {
    params: { id: created.id },
  });
  expect(one.status).toBe(200);

  const updated = await PUT(
    request("http://localhost/api/games/" + created.id, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...game, title: "Route Probe II" }),
    }),
    { params: { id: created.id } },
  );
  expect(updated.status).toBe(200);
  expect(await updated.json()).toMatchObject({ id: created.id, title: "Route Probe II" });

  const removed = await DELETE(request("http://localhost/api/games/" + created.id), {
    params: { id: created.id },
  });
  expect(removed.status).toBe(204);
});

it("returns 400 for an invalid game and invalid JSON", async () => {
  const invalid = await POST(
    request("http://localhost/api/games", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "" }),
    }),
  );
  expect(invalid.status).toBe(400);
  const body = (await invalid.json()) as { error: string; fields: Record<string, string[]> };
  expect(body.error).toBe("Invalid game");
  expect(body.fields.title?.length).toBeGreaterThan(0);

  const broken = await POST(
    request("http://localhost/api/games", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    }),
  );
  expect(broken.status).toBe(400);
  expect(await broken.json()).toEqual({ error: "Invalid JSON", fields: {} });
});

it("returns 404 for a missing game", async () => {
  const missing = "00000000-0000-4000-8000-000000000000";
  const context = { params: { id: missing } };
  expect((await GET(request("http://localhost/api/games/" + missing), context)).status).toBe(404);
  expect(
    (
      await PUT(
        request("http://localhost/api/games/" + missing, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(game),
        }),
        context,
      )
    ).status,
  ).toBe(404);
  expect((await DELETE(request("http://localhost/api/games/" + missing), context)).status).toBe(404);
});

it("returns 409 when the title already exists", async () => {
  await POST(
    request("http://localhost/api/games", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(game),
    }),
  );
  const duplicate = await POST(
    request("http://localhost/api/games", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...game, title: " route probe " }),
    }),
  );
  expect(duplicate.status).toBe(409);
  expect(await duplicate.json()).toEqual({
    error: "A game with this title already exists",
    fields: { title: ["Title must be unique"] },
  });
});

it("returns 413 when Content-Length is over 10 KB", async () => {
  const oversized = await POST(
    request("http://localhost/api/games", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(GAMES_MAX_BODY_BYTES + 1),
      },
      body: "{}",
    }),
  );
  expect(oversized.status).toBe(413);
  expect(await oversized.json()).toEqual({ error: "Request body is too large" });

  const put = await PUT(
    request("http://localhost/api/games/any", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "content-length": String(GAMES_MAX_BODY_BYTES + 1),
      },
      body: "{}",
    }),
    { params: { id: "any" } },
  );
  expect(put.status).toBe(413);
});

it("returns 500 for a corrupt catalog and logs the real error", async () => {
  await writeFile(file, "{", "utf8");
  const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const response = await listGames();
  expect(response.status).toBe(500);
  const text = await response.text();
  expect(JSON.parse(text)).toEqual({ error: "Something went wrong" });
  expect(text).not.toContain("corrupt");
  expect(text).not.toContain("SyntaxError");
  expect(spy).toHaveBeenCalled();
  spy.mockRestore();
});
