import { describe, it, expect, mock } from "bun:test";
import { Hono } from "hono";
import authController from "../auth.controller";
import type { DbClient } from "../../middleware/db.middleware";
import type { Env } from "../../types/env";

// Mock Bun.password for the controller flow
(Bun as any).password = {
  hash: mock(() => Promise.resolve("new_hashed_pw")),
  verify: mock((input: string) => Promise.resolve(input === "correct-password")),
};

const SESSION_COOKIE = "dp_session=test-token-123";

type SessionRow = {
  user: Record<string, unknown>;
  users: Record<string, unknown>;
  role: { name: string };
  roles: { name: string };
};

type MockUpdateBuilder = {
  set: () => MockUpdateBuilder;
  where: () => Promise<void>;
};

type MockQueryBuilder = {
  from: () => MockQueryBuilder;
  innerJoin: () => MockQueryBuilder;
  where: () => MockQueryBuilder;
  limit: () => Promise<SessionRow[]>;
};

/**
 * Build a fake Drizzle client used by authMiddleware (session lookup via
 * `.select().from().innerJoin().innerJoin().where().limit(1)`) and by
 * AuthRepository.findUserByEmail (`.select().from().innerJoin().where().limit(1)`)
 * and AuthRepository.updatePassword (`.update().set().where()`).
 *
 * Both lookups share the same `.select()...limit(1)` chain shape, so results are
 * consumed from a queue: the first `.limit()` (authMiddleware session check)
 * returns `sessionRows`, the next `.limit()` (findUserByEmail) returns `userRows`.
 */
function createMockDb(sessionRows: SessionRow[], userRows: SessionRow[]): DbClient {
  const queue: SessionRow[][] = [sessionRows, userRows];

  const query: MockQueryBuilder = {
    from: () => query,
    innerJoin: () => query,
    where: () => query,
    limit: () => Promise.resolve(queue.shift() ?? []),
  };

  const update: MockUpdateBuilder = {
    set: () => update,
    where: () => Promise.resolve(),
  };

  const db = {
    select: mock(() => query),
    update: mock(() => update),
  } as unknown as DbClient;

  return db;
}

type TestVariables = {
  db: DbClient;
  user: { id: string; name: string; email: string; role_id: string; role_name: string };
};

function createTestApp(db: DbClient) {
  const app = new Hono<{ Bindings: Env; Variables: TestVariables }>();

  // Provide the DI'd db before authMiddleware runs, like dbMiddleware does.
  app.use("*", async (c, next) => {
    c.set("db", db);
    await next();
  });

  app.route("/api/auth", authController);

  return app;
}

describe("auth controller change-password", () => {
  const sessionRow = {
    user: { id: "user-1", name: "Test", email: "test@test.com", role_id: "role-1" },
    users: { id: "user-1", name: "Test", email: "test@test.com", role_id: "role-1" },
    role: { name: "employee" },
    roles: { name: "employee" },
  };

  it("changes the password with valid current password", async () => {
    const db = createMockDb(
      // authMiddleware session lookup -> authenticated user
      [sessionRow],
      // AuthRepository.findUserByEmail -> current user with hashed password
      [{ ...sessionRow, users: { ...sessionRow.users, password: "hashed_pw" } }],
    );
    const app = createTestApp(db);

    const res = await app.request("/api/auth/change-password", {
      method: "POST",
      headers: { cookie: SESSION_COOKIE, "content-type": "application/json" },
      body: JSON.stringify({ current_password: "correct-password", new_password: "new-password-123" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Password changed");
    expect(db.update).toHaveBeenCalled();
  });

  it("returns 401 when current password is incorrect", async () => {
    const db = createMockDb(
      [sessionRow],
      [{ ...sessionRow, users: { ...sessionRow.users, password: "hashed_pw" } }],
    );
    const app = createTestApp(db);

    const res = await app.request("/api/auth/change-password", {
      method: "POST",
      headers: { cookie: SESSION_COOKIE, "content-type": "application/json" },
      body: JSON.stringify({ current_password: "wrong-password", new_password: "new-password-123" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Current password is incorrect");
  });

  it("returns 400 for invalid payload", async () => {
    const db = createMockDb(
      [sessionRow],
      [],
    );
    const app = createTestApp(db);

    const res = await app.request("/api/auth/change-password", {
      method: "POST",
      headers: { cookie: SESSION_COOKIE, "content-type": "application/json" },
      body: JSON.stringify({ current_password: "short", new_password: "x" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 401 when not authenticated", async () => {
    const db = createMockDb([], []);
    const app = createTestApp(db);

    const res = await app.request("/api/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ current_password: "correct-password", new_password: "new-password-123" }),
    });

    expect(res.status).toBe(401);
  });
});
