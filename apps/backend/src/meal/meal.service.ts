import { MealRepository, type MealCreateData, type MealUpdateData } from "./meal.repository";
import type { Meal } from "./meal.model";

export class MealService {
  constructor(private repo: MealRepository) {}

  /**
   * Create a meal owned by `userId`. Both sellers and office boys can create
   * meals for themselves; ownership is always `seller_id = userId` (own-selling
   * or by-food-store via `category_id`).
   */
  async createMeal(userId: string, data: MealCreateData): Promise<Meal> {
    return this.repo.createMeal(userId, data);
  }

  async listMeals(sellerId: string, categoryId?: string): Promise<Meal[]> {
    return this.repo.findBySeller(sellerId, categoryId);
  }

  async getMeal(id: string): Promise<Meal | null> {
    return this.repo.findById(id);
  }

  /**
   * Ownership rule for BOTH seller and office_boy: only the user whose id
   * matches `meal.seller_id` may update the meal.
   */
  async updateMeal(id: string, userId: string, data: MealUpdateData): Promise<Meal> {
    const meal = await this.repo.findById(id);
    if (!meal || meal.seller_id !== userId) throw new Error("Meal not found");
    await this.repo.updateMeal(id, userId, data);
    const updated = await this.repo.findById(id);
    if (!updated) throw new Error("Meal not found after update");
    return updated;
  }

  /**
   * Toggle is_active. Ownership: `meal.seller_id === userId` (seller or office boy).
   */
  async toggleActive(id: string, userId: string): Promise<Meal> {
    const meal = await this.repo.findById(id);
    if (!meal || meal.seller_id !== userId) throw new Error("Meal not found");
    const toggled = await this.repo.toggleActive(id, userId);
    if (!toggled) throw new Error("Meal not found");
    return toggled;
  }

  /**
   * Soft-delete (deactivate). Ownership: `meal.seller_id === userId` (seller or office boy).
   */
  async deleteMeal(id: string, userId: string): Promise<void> {
    const meal = await this.repo.findById(id);
    if (!meal || meal.seller_id !== userId) throw new Error("Meal not found");
    await this.repo.softDelete(id, userId);
  }

  /**
   * Fetch meals that are currently active (is_active = true).
   * Used by employees/office boy/seller/manager to browse available menu.
   */
  async getActiveMeals(categoryId?: string): Promise<Meal[]> {
    return this.repo.findActive(categoryId);
  }
}
