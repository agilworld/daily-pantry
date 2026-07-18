import { eq, and, desc } from "drizzle-orm";
import { meals } from "@dailypantry/shared";
import type { DbClient } from "../middleware/db.middleware";
import type { Meal } from "./meal.model";

export class MealRepository {
  constructor(private db: DbClient) {}

  async createMeal(
    sellerId: string,
    data: { name: string; description: string | null; price_cents: number; category: string },
  ): Promise<Meal> {
    const rows = await this.db
      .insert(meals)
      .values({
        seller_id: sellerId,
        name: data.name,
        description: data.description,
        price_cents: data.price_cents,
        category: data.category,
      })
      .returning();
    return rows[0] as Meal;
  }

  async findBySeller(sellerId: string, category?: string): Promise<Meal[]> {
    const conditions = [eq(meals.seller_id, sellerId)];
    if (category) conditions.push(eq(meals.category, category));
    return this.db
      .select()
      .from(meals)
      .where(and(...conditions))
      .orderBy(desc(meals.created_at)) as Promise<Meal[]>;
  }

  async findById(id: string): Promise<Meal | null> {
    const rows = await this.db
      .select()
      .from(meals)
      .where(eq(meals.id, id))
      .limit(1);
    return rows.length ? (rows[0] as Meal) : null;
  }

  async updateMeal(
    id: string,
    sellerId: string,
    data: Partial<{ name: string; description: string | null; price_cents: number; category: string; is_active: boolean }>,
  ): Promise<void> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price_cents !== undefined) updateData.price_cents = data.price_cents;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    await this.db.update(meals).set(updateData).where(and(eq(meals.id, id), eq(meals.seller_id, sellerId)));
  }

  async toggleActive(id: string, sellerId: string): Promise<Meal | null> {
    const meal = await this.findById(id);
    if (!meal || meal.seller_id !== sellerId) return null;
    await this.db
      .update(meals)
      .set({ is_active: !meal.is_active, updated_at: new Date().toISOString() })
      .where(eq(meals.id, id));
    return { ...meal, is_active: !meal.is_active };
  }

  async softDelete(id: string, sellerId: string): Promise<void> {
    await this.db
      .update(meals)
      .set({ is_active: false, updated_at: new Date().toISOString() })
      .where(and(eq(meals.id, id), eq(meals.seller_id, sellerId)));
  }

  async findActive(category?: string): Promise<Meal[]> {
    const conditions = [eq(meals.is_active, true)];
    if (category) conditions.push(eq(meals.category, category));
    return this.db
      .select()
      .from(meals)
      .where(and(...conditions))
      .orderBy(desc(meals.created_at)) as Promise<Meal[]>;
  }
}
