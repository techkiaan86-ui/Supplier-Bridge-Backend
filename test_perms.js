const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.permission.findMany().then(console.log).finally(() => prisma.$disconnect());
