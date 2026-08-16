import { eq, gt, and } from "drizzle-orm";
import { createDb, users, roles, sessions } from "@dailypantry/shared";
import type { AuthUser } from "./auth.model";

export class AuthRepository {
  constructor(private db: ReturnType<typeof createDb>) {}

  async findUserByEmail(email: string): Promise<(AuthUser & { password: string; role_name: string }) | null> {
    const rows = await this.db
      .select()
      .from(users)
      .innerJoin(roles, eq(users.role_id, roles.id))
      .where(eq(users.email, email))
      .limit(1);

    if (!rows.length) return null;
    const row = rows[0];
    return {
      ...(row.users as AuthUser),
      password: row.users.password,
      role_name: row.roles.name,
    };
  }

  async findUserById(id: string): Promise<(AuthUser & { role_name: string }) | null> {
    const rows = await this.db
      .select()
      .from(users)
      .innerJoin(roles, eq(users.role_id, roles.id))
      .where(eq(users.id, id))
      .limit(1);

    if (!rows.length) return null;
    const row = rows[0];
    const { password, ...user } = row.users;
    return { ...(user as AuthUser), role_name: row.roles.name };
  }

  async createUser(data: { name: string; email: string; password: string; role_id: string }): Promise<AuthUser> {
    const rows = await this.db.insert(users).values({
      name: data.name,
      email: data.email,
      password: data.password,
      role_id: data.role_id,
    }).returning();
    const { password, ...user } = rows[0];
    return user as AuthUser;
  }

  async createSession(userId: string, token: string, expiresAt: string): Promise<void> {
    await this.db.insert(sessions).values({
      user_id: userId,
      token,
      expires_at: expiresAt,
    });
  }

  async findSessionByToken(token: string): Promise<(AuthUser & { role_name: string }) | null> {
    const rows = await this.db
      .select()
      .from(sessions)
      .innerJoin(users, eq(sessions.user_id, users.id))
      .innerJoin(roles, eq(users.role_id, roles.id))
      .where(and(eq(sessions.token, token), gt(sessions.expires_at, new Date().toISOString())))
      .limit(1);

    if (!rows.length) return null;
    const row = rows[0];
    const { password, ...user } = row.users;
    return { ...(user as AuthUser), role_name: row.roles.name };
  }

  async deleteSession(token: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.token, token));
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.db
      .update(users)
      .set({ password: hashedPassword, updated_at: new Date().toISOString() })
      .where(eq(users.id, userId));
  }
}
