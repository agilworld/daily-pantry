import { describe, it, expect, mock, beforeEach } from "bun:test";
import { CategoryService } from "../category.service";
import { CategoryRepository } from "../category.repository";

const sampleCategory = {
  id: "category-1",
  name: "Nasi",
  description: null,
  is_active: true,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: null,
};

function createMockRepo(overrides: Partial<CategoryRepository> = {}): CategoryRepository {
  return {
    findAll: mock(() => Promise.resolve([{ ...sampleCategory }])),
    findById: mock(() => Promise.resolve({ ...sampleCategory })),
    create: mock(() => Promise.resolve({ ...sampleCategory })),
    update: mock(() => Promise.resolve()),
    softDelete: mock(() => Promise.resolve()),
    ...overrides,
  } as unknown as CategoryRepository;
}

describe("CategoryService", () => {
  let repo: CategoryRepository;
  let service: CategoryService;

  beforeEach(() => {
    repo = createMockRepo();
    service = new CategoryService(repo);
  });

  describe("listCategories", () => {
    it("returns all active categories", async () => {
      const categories = await service.listCategories();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe("Nasi");
      expect(repo.findAll).toHaveBeenCalled();
    });
  });

  describe("createCategory", () => {
    it("creates a category with the creator id and description", async () => {
      const category = await service.createCategory(
        { name: "Minuman", description: "Drinks & refreshments" },
        "office-boy-1",
      );
      expect(category.name).toBe("Nasi"); // from mock
      expect(repo.create).toHaveBeenCalledWith("Minuman", "Drinks & refreshments", "office-boy-1");
    });
  });

  describe("updateCategory", () => {
    it("updates an existing category and returns the updated record", async () => {
      const category = await service.updateCategory("category-1", { name: "Nasi Goreng" });
      expect(category).not.toBeNull();
      expect(category!.id).toBe("category-1");
      expect(repo.findById).toHaveBeenCalledWith("category-1");
      expect(repo.update).toHaveBeenCalledWith("category-1", { name: "Nasi Goreng" });
    });

    it("returns null when category does not exist", async () => {
      (repo.findById as any).mockResolvedValue(null);
      const category = await service.updateCategory("category-99", { name: "Nasi Goreng" });
      expect(category).toBeNull();
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteCategory", () => {
    it("soft-deletes an existing category and returns true", async () => {
      const ok = await service.deleteCategory("category-1");
      expect(ok).toBe(true);
      expect(repo.softDelete).toHaveBeenCalledWith("category-1");
    });

    it("returns false when category does not exist", async () => {
      (repo.findById as any).mockResolvedValue(null);
      const ok = await service.deleteCategory("category-99");
      expect(ok).toBe(false);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });
});
