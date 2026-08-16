import { eq } from "drizzle-orm";
import { categories } from "@dailypantry/shared";
import type { DbClient } from "../middleware/db.middleware";
import type { Category } from "./category.model";

export type CategoryCreateData = {
  name: string;
  description: string | null;
};

export type CategoryUpdateData = Partial<CategoryCreateData>;

export class CategoryRepository {
  constructor(private db: DbClient) {}

  async findAll(): Promise<Category[]> {
    const rows = await this.db.select().from(categories).where(eq(categories.is_active, true));
    return rows as Category[];
  }

  async findById(id: string): Promise<Category | null> {
    const rows = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return rows.length ? (rows[0] as Category) : null;
  }

  async create(name: string, description: string | null, createdBy: string): Promise<Category> {
    const rows = await this.db
      .insert(categories)
      .values({ name, description, seller_id: createdBy })
      .returning();
    return rows[0] as Category;
  }

  async update(id: string, data: CategoryUpdateData): Promise<void> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    await this.db.update(categories).set(updateData).where(eq(categories.id, id));
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(categories)
      .set({ is_active: false, updated_at: new Date().toISOString() })
      .where(eq(categories.id, id));
  }
}
