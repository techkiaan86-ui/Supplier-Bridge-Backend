const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.activityLog.findMany().then(console.log).finally(() => prisma.$disconnect());
