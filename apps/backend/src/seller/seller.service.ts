import { SellerRepository } from "./seller.repository";

export class SellerService {
  constructor(private repo: SellerRepository) {}

  async getProfile(userId: string) {
    return this.repo.findProfile(userId);
  }

  async updateProfile(userId: string, data: { name?: string; description?: string; qris_image?: string }) {
    await this.repo.updateProfile(userId, data);
    return this.repo.findProfile(userId);
  }
}
