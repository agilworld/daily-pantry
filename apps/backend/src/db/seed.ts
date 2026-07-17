import { createDb, roles } from "@dailypantry/shared";

// Deterministic UUIDs so re-running doesn't create new roles
const ROLE_IDS = {
  employee: "role-emp-00000000000000000001",
  seller: "role-sel-00000000000000000002",
  office_boy: "role-ob-000000000000000000003",
  manager: "role-mgr-00000000000000000004",
};

export async function seed() {
  const db = createDb();

  const roleData = [
    { id: ROLE_IDS.employee, name: "employee", is_active: true },
    { id: ROLE_IDS.seller, name: "seller", is_active: true },
    { id: ROLE_IDS.office_boy, name: "office_boy", is_active: true },
    { id: ROLE_IDS.manager, name: "manager", is_active: true },
  ];

  for (const role of roleData) {
    await db
      .insert(roles)
      .values(role)
      .onConflictDoNothing({ target: roles.name });
    console.log(`  ✓ Role "${role.name}"`);
  }
}

// Allow running directly: bun run src/db/seed.ts
seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
