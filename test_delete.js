const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const start = Date.now();
prisma.rolePermission.deleteMany({
  where: { roleId: '4538deaf-5682-44b6-bbc9-665c076f5a3f' }
}).then(() => console.log('deleteMany took', Date.now() - start, 'ms'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
