import { describe, it, expect, mock, beforeEach } from "bun:test";
import { UserService } from "../user.service";
import { UserRepository } from "../user.repository";

// Mock Bun.password
mock.module("bun", () => ({
  password: {
    hash: mock(() => Promise.resolve("hashed_pw_xyz")),
  },
}));

function createMockRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findAll: mock(() => Promise.resolve([
      { id: "user-1", name: "Alice", email: "alice@test.com", role_name: "employee", is_active: true, blocked: false, phone_no: null, role_id: "role-emp", created_at: "2024-01-01" },
      { id: "user-2", name: "Bob", email: "bob@test.com", role_name: "seller", is_active: false, blocked: false, phone_no: "123", role_id: "role-sel", created_at: "2024-01-02" },
    ])),
    findById: mock(() => Promise.resolve({ id: "user-1", name: "Alice", email: "alice@test.com", role_name: "employee", is_active: true, blocked: false, phone_no: null, role_id: "role-emp", created_at: "2024-01-01" })),
    findByEmail: mock(() => Promise.resolve([])),
    createUser: mock(() => Promise.resolve({ id: "user-3", name: "New", email: "new@test.com", role_id: "role-emp", is_active: true, blocked: false, phone_no: null, created_at: "2024-01-03" })),
    updateUser: mock(() => Promise.resolve()),
    findRoles: mock(() => Promise.resolve([
      { id: "role-emp", name: "employee", is_active: true },
      { id: "role-sel", name: "seller", is_active: true },
    ])),
    ...overrides,
  } as unknown as UserRepository;
}

describe("UserService", () => {
  let repo: UserRepository;
  let service: UserService;

  beforeEach(() => {
    repo = createMockRepo();
    service = new UserService(repo);
  });

  describe("listUsers", () => {
    it("returns all users", async () => {
      const users = await service.listUsers();
      expect(users).toHaveLength(2);
      expect(users[0].name).toBe("Alice");
    });

    it("filters by role_id", async () => {
      await service.listUsers({ role_id: "role-sel" });
      expect(repo.findAll).toHaveBeenCalledWith({ role_id: "role-sel" });
    });

    it("filters by is_active", async () => {
      await service.listUsers({ is_active: true });
      expect(repo.findAll).toHaveBeenCalledWith({ is_active: true });
    });
  });

  describe("addUser", () => {
    it("creates user with hashed password", async () => {
      const result = await service.addUser({
        name: "New", email: "new@test.com", password: "pass123", role_id: "role-emp",
      });
      expect(result.name).toBe("New");
      expect(repo.createUser).toHaveBeenCalled();
    });

    it("throws on duplicate email", async () => {
      (repo.findByEmail as any).mockResolvedValue([{ id: "exists" }]);

      await expect(service.addUser({
        name: "New", email: "exists@test.com", password: "pass123", role_id: "role-emp",
      })).rejects.toThrow("Email already registered");
    });
  });

  describe("deactivateUser", () => {
    it("sets is_active to false", async () => {
      await service.deactivateUser("user-1");
      expect(repo.updateUser).toHaveBeenCalledWith("user-1", { is_active: false });
    });
  });

  describe("activateUser", () => {
    it("sets is_active to true", async () => {
      await service.activateUser("user-2");
      expect(repo.updateUser).toHaveBeenCalledWith("user-2", { is_active: true });
    });
  });

  describe("getRoles", () => {
    it("returns active roles", async () => {
      const roles = await service.getRoles();
      expect(roles).toHaveLength(2);
      expect(roles[0].name).toBe("employee");
    });
  });
});
