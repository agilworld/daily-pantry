import { AuthRepository } from "./auth.repository";
import type { AuthUser } from "./auth.model";

export class AuthService {
  constructor(private repo: AuthRepository) {}

  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const user = await this.repo.findUserByEmail(email);
    if (!user) throw new Error("Invalid email or password");
    if (!user.is_active) throw new Error("Account is deactivated");
    if (user.blocked) throw new Error("Account is blocked");

    const valid = await Bun.password.verify(password, user.password);
    if (!valid) throw new Error("Invalid email or password");

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await this.repo.createSession(user.id, token, expiresAt);

    const { password: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async register(data: { name: string; email: string; password: string; role_id: string }): Promise<AuthUser> {
    const existing = await this.repo.findUserByEmail(data.email);
    if (existing) throw new Error("Email already registered");

    const hashedPassword = await Bun.password.hash(data.password);
    return this.repo.createUser({ ...data, password: hashedPassword });
  }

  async validateSession(token: string): Promise<(AuthUser & { role_name: string }) | null> {
    return this.repo.findSessionByToken(token);
  }

  async logout(token: string): Promise<void> {
    await this.repo.deleteSession(token);
  }
}
