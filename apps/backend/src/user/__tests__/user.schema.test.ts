import { describe, it, expect } from "bun:test";
import { updateProfileSchema } from "../user.schema";

describe("updateProfileSchema", () => {
  it("accepts a full profile update including email", () => {
    const result = updateProfileSchema.safeParse({
      name: "Ana",
      email: "ana@newcorp.com",
      phone_no: "0812-3456-7890",
      description: "Loves lunch",
      avatar: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ana@newcorp.com");
      expect(result.data.avatar).toBe("data:image/jpeg;base64,/9j/4AAQSkZJRg==");
    }
  });

  it("accepts an email-only update", () => {
    const result = updateProfileSchema.safeParse({ email: "ana@newcorp.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ana@newcorp.com");
    }
  });

  it("rejects an invalid email", () => {
    const result = updateProfileSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(true);
    }
  });

  it("accepts an empty payload (all fields optional for partial updates)", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("strips unknown fields", () => {
    const result = updateProfileSchema.safeParse({ email: "ana@newcorp.com", role_id: "role-1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("role_id");
    }
  });
});
