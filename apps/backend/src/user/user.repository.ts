import { eq, and, sql } from "drizzle-orm";
import { createDb, users, roles } from "@dailypantry/shared";
import type { UserListItem } from "./user.model";
import Bun from "bun";

const userListColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone_no: users.phone_no,
  is_active: users.is_active,
  blocked: users.blocked,
  role_id: users.role_id,
  role_name: roles.name,
  created_at: users.created_at,
} as const;

export class UserRepository {
  constructor(private db: ReturnType<typeof createDb>) {}

  async findAll(filters?: { role_id?: string; is_active?: boolean }): Promise<UserListItem[]> {
    const conditions: ReturnType<typeof sql>[] = [];
    if (filters?.role_id) conditions.push(eq(users.role_id, filters.role_id));
    if (filters?.is_active !== undefined) conditions.push(eq(users.is_active, filters.is_active));

    return this.db
      .select(userListColumns)
      .from(users)
      .innerJoin(roles, eq(users.role_id, roles.id))
      .where(conditions.length ? and(...conditions) : undefined) as Promise<UserListItem[]>;
  }

  async findById(id: string): Promise<UserListItem | null> {
    const rows = await this.db
      .select(userListColumns)
      .from(users)
      .innerJoin(roles, eq(users.role_id, roles.id))
      .where(eq(users.id, id))
      .limit(1);

    return rows.length ? (rows[0] as UserListItem) : null;
  }

  async findByEmail(email: string) {
    return this.db.select().from(users).where(eq(users.email, email)).limit(1);
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role_id: string;
    phone_no?: string | null;
  }) {
    const rows = await this.db
      .insert(users)
      .values({
        id: Bun.randomUUIDv7(),
        name: data.name,
        email: data.email,
        password: data.password,
        role_id: data.role_id,
        phone_no: data.phone_no ?? null,
      })
      .returning();

    const { password, ...user } = rows[0];
    return user;
  }

  async updateUser(
    id: string,
    data: { name?: string; email?: string; is_active?: boolean; phone_no?: string | null; description?: string; avatar?: string },
  ) {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.phone_no !== undefined) updateData.phone_no = data.phone_no;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;

    await this.db.update(users).set(updateData).where(eq(users.id, id));
  }

  async findRoles() {
    return this.db.select().from(roles).where(eq(roles.is_active, true));
  }
}
