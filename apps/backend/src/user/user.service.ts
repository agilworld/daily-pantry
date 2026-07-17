import { UserRepository } from "./user.repository";

export class UserService {
  constructor(private repo: UserRepository) {}

  async listUsers(filters?: { role_id?: string; is_active?: boolean }) {
    return this.repo.findAll(filters);
  }

  async addUser(data: {
    name: string;
    email: string;
    password: string;
    role_id: string;
    phone_no?: string;
  }) {
    const existing = await this.repo.findByEmail(data.email);
    if (existing.length) throw new Error("Email already registered");

    const hashedPassword = await Bun.password.hash(data.password);
    return this.repo.createUser({ ...data, password: hashedPassword });
  }

  async deactivateUser(id: string) {
    await this.repo.updateUser(id, { is_active: false });
  }

  async activateUser(id: string) {
    await this.repo.updateUser(id, { is_active: true });
  }

  async getRoles() {
    return this.repo.findRoles();
  }
}
