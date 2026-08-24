const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.role.findFirst({ where: { name: 'administrator' } })
  .then(console.log)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
