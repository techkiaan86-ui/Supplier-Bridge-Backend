const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const roleId = '4538deaf-5682-44b6-bbc9-665c076f5a3f'; // administrator
  
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  
  const permsInDb = await prisma.permission.findMany({
    where: { name: { in: ['dashboard', 'suppliers'] } }
  });
  
  await prisma.rolePermission.createMany({
    data: permsInDb.map(p => ({
      roleId,
      permissionId: p.id
    }))
  });
  
  const finalRole = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        include: { permission: true }
      }
    }
  });
  
  console.log(finalRole.permissions);
}
test().catch(console.error).finally(() => prisma.$disconnect());
