/**
 * seed-admin-users.ts
 * Adds rachel@codelab303.com and gavin@codelab303.com as ADMIN users
 * in both active companies (codelab303 + yolo-inc).
 *
 * Run:
 *   DATABASE_URL="..." NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx prisma/seed-admin-users.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "margot2026yolo!";

const USERS = [
  // codelab303 company
  { email: "rachel@codelab303.com", name: "Rachel", companyId: "codelab303" },
  { email: "gavin@codelab303.com", name: "Gavin", companyId: "codelab303" },
  // yolo-inc company — follows the +yolo suffix convention
  {
    email: "rachel+yolo@codelab303.com",
    name: "Rachel",
    companyId: "yolo-inc",
  },
  { email: "gavin+yolo@codelab303.com", name: "Gavin", companyId: "yolo-inc" },
];

async function main() {
  // Ensure codelab303 company exists (main seed.ts may not have run on this DB)
  await prisma.company.upsert({
    where: { id: "codelab303" },
    update: {},
    create: { id: "codelab303", name: "codelab303 LLC", fiscalYearStart: 1 },
  });
  console.log("✅  Company: codelab303 LLC");

  const hashedPw = await bcrypt.hash(PASSWORD, 12);

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hashedPw, role: "ADMIN" },
      create: {
        email: u.email,
        name: u.name,
        password: hashedPw,
        role: "ADMIN",
        companyId: u.companyId,
      },
    });
    console.log(`✅  ${user.email}  (${u.companyId})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
