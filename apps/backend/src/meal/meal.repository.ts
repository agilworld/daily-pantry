import { eq, and, desc } from "drizzle-orm";
import { meals, categories } from "@dailypantry/shared";
import type { DbClient } from "../middleware/db.middleware";
import type { Meal } from "./meal.model";

export type MealCreateData = {
  name: string;
  description: string | null;
  price_cents: number;
  category_id: string | null;
};

export type MealUpdateData = Partial<
  Pick<MealCreateData, "name" | "description" | "price_cents" | "category_id"> & {
    is_active: boolean;
  }
>;

type MealWithCategoryRow = {
  meals: {
    id: string;
    seller_id: string;
    name: string;
    description: string | null;
    price_cents: number;
    category_id: string | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
  };
  categories: {
    id: string;
    name: string;
  } | null;
};

/** Map a joined row (meals + categories.name) to a Meal. */
function toMeal(row: MealWithCategoryRow): Meal {
  return {
    id: row.meals.id,
    seller_id: row.meals.seller_id,
    name: row.meals.name,
    description: row.meals.description,
    price_cents: row.meals.price_cents,
    category_id: row.meals.category_id,
    category_name: row.categories?.name ?? null,
    is_active: row.meals.is_active ?? false,
    created_at: row.meals.created_at ?? "",
    updated_at: row.meals.updated_at,
  };
}

/** Shared select shape with a left join so category_name is available on every meal. */
const mealWithCategory = {
  meals: {
    id: meals.id,
    seller_id: meals.seller_id,
    name: meals.name,
    description: meals.description,
    price_cents: meals.price_cents,
    category_id: meals.category_id,
    is_active: meals.is_active,
    created_at: meals.created_at,
    updated_at: meals.updated_at,
  },
  categories: {
    id: categories.id,
    name: categories.name,
  },
};

export class MealRepository {
  constructor(private db: DbClient) {}

  async createMeal(sellerId: string, data: MealCreateData): Promise<Meal> {
    const rows = await this.db
      .insert(meals)
      .values({
        seller_id: sellerId,
        name: data.name,
        description: data.description,
        price_cents: data.price_cents,
        category_id: data.category_id,
      })
      .returning();
    const meal = rows[0] as typeof meals.$inferSelect;
    return {
      id: meal.id,
      seller_id: meal.seller_id,
      name: meal.name,
      description: meal.description,
      price_cents: meal.price_cents,
      category_id: meal.category_id,
      category_name: null,
      is_active: meal.is_active ?? false,
      created_at: meal.created_at ?? "",
      updated_at: meal.updated_at,
    };
  }

  async findBySeller(sellerId: string, categoryId?: string): Promise<Meal[]> {
    const conditions = [eq(meals.seller_id, sellerId)];
    if (categoryId) conditions.push(eq(meals.category_id, categoryId));
    const rows = await this.db
      .select(mealWithCategory)
      .from(meals)
      .leftJoin(categories, eq(meals.category_id, categories.id))
      .where(and(...conditions))
      .orderBy(desc(meals.created_at));
    return rows.map(toMeal);
  }

  async findById(id: string): Promise<Meal | null> {
    const rows = await this.db
      .select(mealWithCategory)
      .from(meals)
      .leftJoin(categories, eq(meals.category_id, categories.id))
      .where(eq(meals.id, id))
      .limit(1);
    return rows.length ? toMeal(rows[0]) : null;
  }

  async updateMeal(id: string, sellerId: string, data: MealUpdateData): Promise<void> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price_cents !== undefined) updateData.price_cents = data.price_cents;
    if (data.category_id !== undefined) updateData.category_id = data.category_id;
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

  async findActive(categoryId?: string): Promise<Meal[]> {
    const conditions = [eq(meals.is_active, true)];
    if (categoryId) conditions.push(eq(meals.category_id, categoryId));
    const rows = await this.db
      .select(mealWithCategory)
      .from(meals)
      .leftJoin(categories, eq(meals.category_id, categories.id))
      .where(and(...conditions))
      .orderBy(desc(meals.created_at));
    return rows.map(toMeal);
  }
}
