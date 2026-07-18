import { MealRepository } from "./meal.repository";
import type { Meal } from "./meal.model";

export class MealService {
  constructor(private repo: MealRepository) {}

  async createMeal(
    sellerId: string,
    data: { name: string; description: string | null; price_cents: number; category: string },
  ): Promise<Meal> {
    return this.repo.createMeal(sellerId, data);
  }

  async listMeals(sellerId: string, category?: string): Promise<Meal[]> {
    return this.repo.findBySeller(sellerId, category);
  }

  async getMeal(id: string): Promise<Meal | null> {
    return this.repo.findById(id);
  }

  async updateMeal(
    id: string,
    sellerId: string,
    data: Partial<{ name: string; description: string | null; price_cents: number; category: string; is_active: boolean }>,
  ): Promise<Meal> {
    const meal = await this.repo.findById(id);
    if (!meal || meal.seller_id !== sellerId) throw new Error("Meal not found");
    await this.repo.updateMeal(id, sellerId, data);
    const updated = await this.repo.findById(id);
    if (!updated) throw new Error("Meal not found after update");
    return updated;
  }

  async toggleActive(id: string, sellerId: string): Promise<Meal> {
    const meal = await this.repo.findById(id);
    if (!meal || meal.seller_id !== sellerId) throw new Error("Meal not found");
    const toggled = await this.repo.toggleActive(id, sellerId);
    if (!toggled) throw new Error("Meal not found");
    return toggled;
  }

  async deleteMeal(id: string, sellerId: string): Promise<void> {
    const meal = await this.repo.findById(id);
    if (!meal || meal.seller_id !== sellerId) throw new Error("Meal not found");
    await this.repo.softDelete(id, sellerId);
  }

  /**
   * Fetch meals that are currently active (is_active = true).
   * Used by employees/office boy to browse available menu.
   */
  async getActiveMeals(category?: string): Promise<Meal[]> {
    return this.repo.findActive(category);
  }
}
