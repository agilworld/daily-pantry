import { CategoryRepository, type CategoryCreateData, type CategoryUpdateData } from "./category.repository";
import type { Category } from "./category.model";

export class CategoryService {
  constructor(private repo: CategoryRepository) {}

  async listCategories(): Promise<Category[]> {
    return this.repo.findAll();
  }

  async createCategory(data: CategoryCreateData, createdBy: string): Promise<Category> {
    return this.repo.create(data.name, data.description, createdBy);
  }

  async updateCategory(id: string, data: CategoryUpdateData): Promise<Category | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;
    await this.repo.update(id, data);
    return this.repo.findById(id);
  }

  async deleteCategory(id: string): Promise<boolean> {
    const existing = await this.repo.findById(id);
    if (!existing) return false;
    await this.repo.softDelete(id);
    return true;
  }
}
