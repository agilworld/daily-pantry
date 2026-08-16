import { describe, it, expect, mock } from "bun:test";
import { Hono } from "hono";
import { roleGuard, type RoleName } from "../role.middleware";
import type { DbClient } from "../db.middleware";
import type { Env } from "../../types/env";

const SESSION_COOKIE = "dp_session=test-token-123";

type SessionRow = { user_id: string; role_name: string };

type MockQueryBuilder = {
  from: () => MockQueryBuilder;
  innerJoin: () => MockQueryBuilder;
  where: () => MockQueryBuilder;
  limit: () => Promise<SessionRow[]>;
};

/**
 * Build a fake Drizzle client whose query chain resolves to `sessionResult`.
 * Mirrors the `.select().from().innerJoin().innerJoin().where().limit(1)`
 * chain used by roleGuard.
 */
function createMockDb(sessionResult: SessionRow[]): DbClient {
  const query: MockQueryBuilder = {
    from: () => query,
    innerJoin: () => query,
    where: () => query,
    limit: () => Promise.resolve(sessionResult),
  };

  const db = {
    select: mock(() => query),
  } as unknown as DbClient;

  return db;
}

type TestVariables = {
  db: DbClient;
  user: { id: string; role_name: string };
};

function createTestApp(db: DbClient, ...roles: RoleName[]) {
  const app = new Hono<{ Bindings: Env; Variables: TestVariables }>();

  // Provide the DI'd db before roleGuard runs, like dbMiddleware does.
  app.use("*", async (c, next) => {
    c.set("db", db);
    await next();
  });
  app.use("*", roleGuard(...roles));

  app.get("/test", (c) => {
    return c.json({ ok: true, user: c.get("user") });
  });

  return app;
}

describe("roleGuard middleware", () => {
  it("allows access when user role is in the allowed roles list", async () => {
    const db = createMockDb([{ user_id: "user-1", role_name: "seller" }]);
    const app = createTestApp(db, "seller", "office_boy");

    const res = await app.request("/test", { headers: { cookie: SESSION_COOKIE } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, user: { id: "user-1", role_name: "seller" } });
    expect(db.select).toHaveBeenCalled();
  });

  it("allows access when user matches the second role in the list", async () => {
    const db = createMockDb([{ user_id: "user-2", role_name: "office_boy" }]);
    const app = createTestApp(db, "seller", "office_boy");

    const res = await app.request("/test", { headers: { cookie: SESSION_COOKIE } });

    expect(res.status).toBe(200);
  });

  it("denies access when user role is not in the allowed roles list", async () => {
    const db = createMockDb([{ user_id: "user-3", role_name: "employee" }]);
    const app = createTestApp(db, "seller", "office_boy");

    const res = await app.request("/test", { headers: { cookie: SESSION_COOKIE } });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("still allows access with a single role", async () => {
    const db = createMockDb([{ user_id: "user-4", role_name: "office_boy" }]);
    const app = createTestApp(db, "office_boy");

    const res = await app.request("/test", { headers: { cookie: SESSION_COOKIE } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.role_name).toBe("office_boy");
  });

  it("returns 401 when no session cookie is present", async () => {
    const db = createMockDb([{ user_id: "user-1", role_name: "seller" }]);
    const app = createTestApp(db, "seller", "office_boy");

    const res = await app.request("/test");

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when the session is invalid or expired", async () => {
    const db = createMockDb([]);
    const app = createTestApp(db, "seller", "office_boy");

    const res = await app.request("/test", { headers: { cookie: SESSION_COOKIE } });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });
});
