import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const userData: Prisma.UserCreateInput[] = [
  {
    username: "user",
    password: "password",
    role: "user",
  },
  {
    username: "admin",
    password: "password",
    role: "admin",
  },
];

const userDataSafe: Prisma.UserCreateInput[] = [
  {
    username: "user",
    password: "1216985755",
    role: "user",
  },
  {
    username: "admin",
    password: "1216985755",
    role: "admin",
  },
];

async function main() {
  console.log(`Start seeding ...`);
  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
    });
    console.log(`Created user with id: ${user.id}`);
  }
  console.log(`Seeding finished.`);

  console.log(`Start safe seeding ...`);
  for (const u of userDataSafe) {
    const user = await prisma.userSafe.create({
      data: u,
    });
    console.log(`Created safe user with id: ${user.id}`);
  }
  console.log(`Safe seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
