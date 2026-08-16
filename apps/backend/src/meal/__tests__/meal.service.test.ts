import { describe, it, expect, mock, beforeEach } from "bun:test";
import { MealService } from "../meal.service";
import { MealRepository } from "../meal.repository";

const sampleMeal = {
  id: "meal-1",
  seller_id: "seller-1",
  name: "Nasi Goreng",
  description: "Spicy fried rice",
  price_cents: 25000,
  category_id: null,
  category_name: null,
  is_active: true,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: null,
};

function createMockRepo(overrides: Partial<MealRepository> = {}): MealRepository {
  return {
    createMeal: mock((sellerId: string, data: { name: string; description: string | null; price_cents: number; category_id: string | null }) =>
      Promise.resolve({ ...sampleMeal, seller_id: sellerId, ...data }),
    ),
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
    it("creates an own-selling meal for the user (category_id null)", async () => {
      const meal = await service.createMeal("seller-1", {
        name: "Nasi Goreng",
        description: "Spicy fried rice",
        price_cents: 25000,
        category_id: null,
      });

      expect(meal.name).toBe("Nasi Goreng");
      expect(meal.seller_id).toBe("seller-1");
      expect(meal.price_cents).toBe(25000);
      expect(repo.createMeal).toHaveBeenCalledWith("seller-1", {
        name: "Nasi Goreng",
        description: "Spicy fried rice",
        price_cents: 25000,
        category_id: null,
      });
    });

    it("creates a by-food-store meal for an office boy (category_id set)", async () => {
      const meal = await service.createMeal("office-boy-1", {
        name: "Ayam Geprek",
        description: null,
        price_cents: 20000,
        category_id: "11111111-1111-1111-1111-111111111111",
      });

      expect(meal.seller_id).toBe("office-boy-1");
      expect(meal.category_id).toBe("11111111-1111-1111-1111-111111111111");
      expect(repo.createMeal).toHaveBeenCalledWith("office-boy-1", {
        name: "Ayam Geprek",
        description: null,
        price_cents: 20000,
        category_id: "11111111-1111-1111-1111-111111111111",
      });
    });
  });

  describe("listMeals", () => {
    it("lists meals for the seller", async () => {
      const meals = await service.listMeals("seller-1");
      expect(meals).toHaveLength(1);
      expect(meals[0].seller_id).toBe("seller-1");
    });

    it("passes category_id filter to repository", async () => {
      await service.listMeals("seller-1", "11111111-1111-1111-1111-111111111111");
      expect(repo.findBySeller).toHaveBeenCalledWith("seller-1", "11111111-1111-1111-1111-111111111111");
    });
  });

  describe("updateMeal", () => {
    it("updates a meal owned by the user", async () => {
      const meal = await service.updateMeal("meal-1", "seller-1", { name: "New Name" });
      expect(meal.name).toBe("Nasi Goreng"); // from mock
      expect(repo.updateMeal).toHaveBeenCalled();
    });

    it("allows an office boy to update their own meal", async () => {
      const officeBoyOwned = { ...sampleMeal, seller_id: "office-boy-1" };
      (repo.findById as any).mockResolvedValue({ ...officeBoyOwned });
      const meal = await service.updateMeal("meal-1", "office-boy-1", { name: "New Name" });
      expect(meal.name).toBe("Nasi Goreng"); // from mock
      expect(repo.updateMeal).toHaveBeenCalledWith("meal-1", "office-boy-1", { name: "New Name" });
    });

    it("throws when meal does not exist", async () => {
      (repo.findById as any).mockResolvedValue(null);
      await expect(service.updateMeal("meal-99", "seller-1", { name: "X" }))
        .rejects.toThrow("Meal not found");
    });

    it("throws when meal belongs to another user (ownership check)", async () => {
      (repo.findById as any).mockResolvedValue({ ...sampleMeal, seller_id: "seller-2" });
      await expect(service.updateMeal("meal-1", "seller-1", { name: "X" }))
        .rejects.toThrow("Meal not found");
    });

    it("throws when an office boy tries to update a seller's meal", async () => {
      (repo.findById as any).mockResolvedValue({ ...sampleMeal, seller_id: "seller-1" });
      await expect(service.updateMeal("meal-1", "office-boy-1", { name: "X" }))
        .rejects.toThrow("Meal not found");
    });
  });

  describe("toggleActive", () => {
    it("toggles is_active for owned meal", async () => {
      const meal = await service.toggleActive("meal-1", "seller-1");
      expect(meal.is_active).toBe(false);
      expect(repo.toggleActive).toHaveBeenCalledWith("meal-1", "seller-1");
    });

    it("throws when meal belongs to another user", async () => {
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

    it("throws when meal belongs to another user", async () => {
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

    it("passes category_id filter", async () => {
      await service.getActiveMeals("11111111-1111-1111-1111-111111111111");
      expect(repo.findActive).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111");
    });
  });
});
