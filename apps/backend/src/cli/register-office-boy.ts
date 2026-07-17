import { createDb, users, roles } from "@dailypantry/shared";
import { eq } from "drizzle-orm";
import * as readline from "node:readline";

const OFFICE_BOY_ROLE_ID = "role-ob-000000000000000000003"; // from seeder

function parseArgs(): { name?: string; email?: string; password?: string } {
  const args: Record<string, string> = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i].replace(/^--/, "");
    args[key] = process.argv[i + 1] || "";
  }
  return { name: args.name, email: args.email, password: args.password };
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = parseArgs();

  const name = args.name || (await prompt("Name: "));
  const email = args.email || (await prompt("Email: "));
  const password = args.password || (await prompt("Password: "));

  if (!name || !email || !password) {
    console.error("❌ Name, email, and password are required");
    process.exit(1);
  }

  if (!email.includes("@")) {
    console.error("❌ Invalid email format");
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("❌ Password must be at least 6 characters");
    process.exit(1);
  }

  const db = createDb();

  // Check email uniqueness
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    console.error(`❌ User with email "${email}" already exists`);
    process.exit(1);
  }

  // Verify office_boy role exists
  const role = await db.select().from(roles).where(eq(roles.id, OFFICE_BOY_ROLE_ID)).limit(1);
  if (!role.length) {
    console.error("❌ Office boy role not found. Run `bun run db:seed` first.");
    process.exit(1);
  }

  // Hash password and create user
  const hashedPassword = await Bun.password.hash(password);
  await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
    role_id: OFFICE_BOY_ROLE_ID,
  });

  console.log(`✅ Office boy "${name}" (${email}) registered successfully`);
}

main().catch((err) => {
  console.error("❌ Registration failed:", err.message || err);
  process.exit(1);
});
