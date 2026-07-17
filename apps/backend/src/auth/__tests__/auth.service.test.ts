import { describe, it, expect, mock, beforeEach } from "bun:test";
import { AuthService } from "../auth.service";
import { AuthRepository } from "../auth.repository";

// Mock Bun.password (global, not module import — mock.module won't intercept globals)
(Bun as any).password = {
  hash: mock(() => Promise.resolve("hashed_pw_123")),
  verify: mock((input: string) => Promise.resolve(input === "correct-password")),
};

// Mock crypto.randomUUID
crypto.randomUUID = mock((): `${string}-${string}-${string}-${string}-${string}` => "mock-session-token-123" as `${string}-${string}-${string}-${string}-${string}`);

function createMockRepo(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findUserByEmail: mock(() => Promise.resolve(null)),
    findUserById: mock(() => Promise.resolve(null)),
    createUser: mock(() => Promise.resolve({
      id: "user-1", name: "Test", email: "test@test.com", role_id: "role-1",
      phone_no: null, avatar: null, description: null, is_active: true, blocked: false,
      created_at: new Date().toISOString(),
    })),
    createSession: mock(() => Promise.resolve()),
    findSessionByToken: mock(() => Promise.resolve(null)),
    deleteSession: mock(() => Promise.resolve()),
    ...overrides,
  } as unknown as AuthRepository;
}

describe("AuthService", () => {
  let repo: AuthRepository;
  let service: AuthService;

  beforeEach(() => {
    repo = createMockRepo();
    service = new AuthService(repo);
  });

  describe("login", () => {
    it("returns user and token on valid credentials", async () => {
      (repo.findUserByEmail as any).mockResolvedValue({
        id: "user-1", name: "Test User", email: "test@test.com",
        role_id: "role-1", role_name: "employee", is_active: true, blocked: false,
        password: "hashed_pw_123",
      });

      const result = await service.login("test@test.com", "correct-password");

      expect(result.user.email).toBe("test@test.com");
      expect(result.token).toBe("mock-session-token-123");
      expect((result.user as any).password).toBeUndefined();
      expect(repo.createSession).toHaveBeenCalled();
    });

    it("throws on wrong password", async () => {
      (repo.findUserByEmail as any).mockResolvedValue({
        id: "user-1", email: "test@test.com", is_active: true, blocked: false,
        password: "hashed_pw_123",
      });

      await expect(service.login("test@test.com", "wrong-password"))
        .rejects.toThrow("Invalid email or password");
    });

    it("throws on non-existent email", async () => {
      (repo.findUserByEmail as any).mockResolvedValue(null);

      await expect(service.login("nobody@test.com", "password"))
        .rejects.toThrow("Invalid email or password");
    });

    it("throws on deactivated account", async () => {
      (repo.findUserByEmail as any).mockResolvedValue({
        id: "user-1", email: "test@test.com", is_active: false, blocked: false,
        password: "hashed_pw_123",
      });

      await expect(service.login("test@test.com", "correct-password"))
        .rejects.toThrow("Account is deactivated");
    });

    it("throws on blocked account", async () => {
      (repo.findUserByEmail as any).mockResolvedValue({
        id: "user-1", email: "test@test.com", is_active: true, blocked: true,
        password: "hashed_pw_123",
      });

      await expect(service.login("test@test.com", "correct-password"))
        .rejects.toThrow("Account is blocked");
    });
  });

  describe("register", () => {
    it("creates user with hashed password", async () => {
      const result = await service.register({
        name: "New User", email: "new@test.com", password: "password123", role_id: "role-1",
      });

      expect(result.email).toBe("test@test.com");
      expect((result as any).password).toBeUndefined();
      expect(repo.createUser).toHaveBeenCalled();
    });

    it("throws on duplicate email", async () => {
      (repo.findUserByEmail as any).mockResolvedValue({ id: "existing" });

      await expect(service.register({
        name: "New", email: "exists@test.com", password: "password123", role_id: "role-1",
      })).rejects.toThrow("Email already registered");
    });
  });

  describe("validateSession", () => {
    it("returns user for valid token", async () => {
      (repo.findSessionByToken as any).mockResolvedValue({
        id: "user-1", name: "Test", email: "test@test.com", role_name: "employee",
      });

      const result = await service.validateSession("mock-session-token-123");
      expect(result).not.toBeNull();
      expect(result!.email).toBe("test@test.com");
    });

    it("returns null for invalid token", async () => {
      (repo.findSessionByToken as any).mockResolvedValue(null);

      const result = await service.validateSession("bad-token");
      expect(result).toBeNull();
    });
  });

  describe("logout", () => {
    it("deletes the session", async () => {
      await service.logout("mock-session-token-123");
      expect(repo.deleteSession).toHaveBeenCalledWith("mock-session-token-123");
    });
  });
});
