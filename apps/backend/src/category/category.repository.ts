import { eq } from "drizzle-orm";
import { categories } from "@dailypantry/shared";
import type { DbClient } from "../middleware/db.middleware";
import type { Category } from "./category.model";

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

  async create(name: string, createdBy: string): Promise<Category> {
    const rows = await this.db.insert(categories).values({ name, seller_id: createdBy }).returning();
    return rows[0] as Category;
  }

  async update(id: string, name: string): Promise<void> {
    await this.db
      .update(categories)
      .set({ name, updated_at: new Date().toISOString() })
      .where(eq(categories.id, id));
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(categories)
      .set({ is_active: false, updated_at: new Date().toISOString() })
      .where(eq(categories.id, id));
  }
}
