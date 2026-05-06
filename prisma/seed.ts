import {
  PrismaClient,
  PersonType,
  ProjectClass,
  ProjectStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Ledger database…");

  // Create company
  const company = await prisma.company.upsert({
    where: { id: "codelab303" },
    update: {},
    create: {
      id: "codelab303",
      name: "codelab303 LLC",
      fiscalYearStart: 1,
    },
  });

  console.log(`Company: ${company.name}`);

  // Company settings
  await prisma.companySettings.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      defaultBurdenRate: 1.25,
      defaultContractorLag: 30,
      revenueTarget: 1_800_000,
      grossMarginTargetMin: 0.28,
      grossMarginTargetMax: 0.32,
      netProfitTarget: 125_000,
    },
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash("ledger2026!", 12);
  const user = await prisma.user.upsert({
    where: { email: "anthony@codelab303.com" },
    update: {},
    create: {
      email: "anthony@codelab303.com",
      name: "Anthony Chavez",
      password: hashedPassword,
      role: "ADMIN",
      companyId: company.id,
    },
  });

  console.log(`User: ${user.email}`);

  // Create team members
  const people = [
    {
      name: "Anthony Chavez",
      email: "anthony@codelab303.com",
      type: PersonType.PARTNER,
      annualSalary: 180_000,
      burdenRate: 1.2,
    },
    {
      name: "Lead Engineer",
      email: "lead@codelab303.com",
      type: PersonType.SALARIED,
      annualSalary: 140_000,
      burdenRate: 1.25,
    },
    {
      name: "Senior Designer",
      email: "design@codelab303.com",
      type: PersonType.SALARIED,
      annualSalary: 110_000,
      burdenRate: 1.25,
    },
    {
      name: "Biz Dev Contractor",
      email: null,
      type: PersonType.CONTRACTOR,
      hourlyRate: 125,
      invoiceLagDays: 30,
    },
    {
      name: "Engineering Contractor",
      email: null,
      type: PersonType.CONTRACTOR,
      hourlyRate: 150,
      invoiceLagDays: 30,
    },
  ];

  for (const p of people) {
    const person = await prisma.person.upsert({
      where: {
        id: `seed-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: {},
      create: {
        id: `seed-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
        companyId: company.id,
        name: p.name,
        email: p.email,
        type: p.type,
      },
    });

    // Create compensation record if none exists
    const existingComp = await prisma.compensationRecord.findFirst({
      where: { personId: person.id },
    });

    if (!existingComp) {
      await prisma.compensationRecord.create({
        data: {
          personId: person.id,
          effectiveDate: new Date("2024-01-01"),
          annualSalary: p.annualSalary ?? null,
          hourlyRate: (p as { hourlyRate?: number }).hourlyRate ?? null,
          burdenRate: p.burdenRate ?? 1.25,
          invoiceLagDays:
            (p as { invoiceLagDays?: number }).invoiceLagDays ?? 30,
        },
      });
    }

    console.log(`Person: ${person.name} (${person.type})`);
  }

  // Create sample projects
  const projects = [
    {
      id: "seed-project-alpha",
      name: "Client Alpha — Platform Build",
      clientName: "Alpha Industries",
      classification: ProjectClass.FUND,
      status: ProjectStatus.ACTIVE,
      contractValue: 240_000,
    },
    {
      id: "seed-project-beta",
      name: "Client Beta — Retainer",
      clientName: "Beta Corp",
      classification: ProjectClass.FUND,
      status: ProjectStatus.ACTIVE,
      monthlyRetainer: 18_000,
    },
    {
      id: "seed-project-gamma",
      name: "Gamma — Strategic Initiative",
      clientName: "Gamma Ventures",
      classification: ProjectClass.FRONTIER,
      status: ProjectStatus.ACTIVE,
      contractValue: 85_000,
    },
    {
      id: "seed-internal",
      name: "Internal / Non-Billable",
      clientName: null,
      classification: ProjectClass.FRONTIER,
      status: ProjectStatus.ACTIVE,
      contractValue: null,
    },
  ];

  for (const proj of projects) {
    const project = await prisma.project.upsert({
      where: { id: proj.id },
      update: {},
      create: {
        id: proj.id,
        companyId: company.id,
        name: proj.name,
        clientName: proj.clientName,
        classification: proj.classification,
        status: proj.status,
        startDate: new Date("2024-01-01"),
        contractValue: proj.contractValue ?? null,
        monthlyRetainer: proj.monthlyRetainer ?? null,
      },
    });
    console.log(`Project: ${project.name}`);
  }

  console.log("\nSeed complete. Login at http://localhost:3000/login");
  console.log("Email:    anthony@codelab303.com");
  console.log("Password: ledger2026!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
