import { describe, it, expect, mock, beforeEach } from "bun:test";
import { MealService } from "../meal.service";
import { MealRepository } from "../meal.repository";

const sampleMeal = {
  id: "meal-1",
  seller_id: "seller-1",
  name: "Nasi Goreng",
  description: "Spicy fried rice",
  price_cents: 25000,
  category: "nasi",
  is_active: true,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: null,
};

function createMockRepo(overrides: Partial<MealRepository> = {}): MealRepository {
  return {
    createMeal: mock(() => Promise.resolve({ ...sampleMeal })),
    findById: mock(() => Promise.resolve({ ...sampleMeal })),
    findBySeller: mock(() => Promise.resolve([{ ...sampleMeal }])),
    updateMeal: mock(() => Promise.resolve()),
    toggleActive: mock(() => Promise.resolve({ ...sampleMeal, is_active: false })),
    softDelete: mock(() => Promise.resolve()),
    findActive: mock(() => Promise.resolve([{ ...sampleMeal }])),
    ...overrides,
  } as unknown as MealRepository;
}

describe("MealService", () => {
  let repo: MealRepository;
  let service: MealService;

  beforeEach(() => {
    repo = createMockRepo();
    service = new MealService(repo);
  });

  describe("createMeal", () => {
    it("creates a meal for the seller", async () => {
      const meal = await service.createMeal("seller-1", {
        name: "Nasi Goreng",
        description: "Spicy fried rice",
        price_cents: 25000,
        category: "nasi",
      });

      expect(meal.name).toBe("Nasi Goreng");
      expect(meal.seller_id).toBe("seller-1");
      expect(meal.price_cents).toBe(25000);
      expect(repo.createMeal).toHaveBeenCalledWith("seller-1", {
        name: "Nasi Goreng",
        description: "Spicy fried rice",
        price_cents: 25000,
        category: "nasi",
      });
    });
  });

  describe("listMeals", () => {
    it("lists meals for the seller", async () => {
      const meals = await service.listMeals("seller-1");
      expect(meals).toHaveLength(1);
      expect(meals[0].seller_id).toBe("seller-1");
    });

    it("passes category filter to repository", async () => {
      await service.listMeals("seller-1", "nasi");
      expect(repo.findBySeller).toHaveBeenCalledWith("seller-1", "nasi");
    });
  });

  describe("updateMeal", () => {
    it("updates a meal owned by the seller", async () => {
      const meal = await service.updateMeal("meal-1", "seller-1", { name: "New Name" });
      expect(meal.name).toBe("Nasi Goreng"); // from mock
      expect(repo.updateMeal).toHaveBeenCalled();
    });

    it("throws when meal does not exist", async () => {
      (repo.findById as any).mockResolvedValue(null);
      await expect(service.updateMeal("meal-99", "seller-1", { name: "X" }))
        .rejects.toThrow("Meal not found");
    });

    it("throws when meal belongs to another seller (ownership check)", async () => {
      (repo.findById as any).mockResolvedValue({ ...sampleMeal, seller_id: "seller-2" });
      await expect(service.updateMeal("meal-1", "seller-1", { name: "X" }))
        .rejects.toThrow("Meal not found");
    });
  });

  describe("toggleActive", () => {
    it("toggles is_active for owned meal", async () => {
      const meal = await service.toggleActive("meal-1", "seller-1");
      expect(meal.is_active).toBe(false);
      expect(repo.toggleActive).toHaveBeenCalledWith("meal-1", "seller-1");
    });

    it("throws when meal belongs to another seller", async () => {
      (repo.findById as any).mockResolvedValue({ ...sampleMeal, seller_id: "seller-2" });
      await expect(service.toggleActive("meal-1", "seller-1"))
        .rejects.toThrow("Meal not found");
    });
  });

  describe("deleteMeal", () => {
    it("soft-deletes (deactivates) an owned meal", async () => {
      await service.deleteMeal("meal-1", "seller-1");
      expect(repo.softDelete).toHaveBeenCalledWith("meal-1", "seller-1");
    });

    it("throws when meal belongs to another seller", async () => {
      (repo.findById as any).mockResolvedValue({ ...sampleMeal, seller_id: "seller-2" });
      await expect(service.deleteMeal("meal-1", "seller-1"))
        .rejects.toThrow("Meal not found");
    });
  });

  describe("getActiveMeals", () => {
    it("returns active meals", async () => {
      const meals = await service.getActiveMeals();
      expect(meals).toHaveLength(1);
    });

    it("passes category filter", async () => {
      await service.getActiveMeals("minuman");
      expect(repo.findActive).toHaveBeenCalledWith("minuman");
    });
  });
});
