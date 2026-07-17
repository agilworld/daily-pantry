import { eq } from "drizzle-orm";
import { createDb, users } from "@dailypantry/shared";

export class SellerRepository {
  constructor(private db: ReturnType<typeof createDb>) {}

  async findProfile(userId: string) {
    const rows = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        description: users.description,
        qris_image: users.avatar, // QRIS stored in avatar column
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return rows.length ? rows[0] : null;
  }

  async updateProfile(userId: string, data: { name?: string; description?: string; qris_image?: string }) {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.qris_image !== undefined) updateData.avatar = data.qris_image; // QRIS → avatar column

    await this.db.update(users).set(updateData).where(eq(users.id, userId));
  }
}
