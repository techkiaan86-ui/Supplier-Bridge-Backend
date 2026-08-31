const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createUser() {
  try {
    const hashedPassword = await bcrypt.hash('123', 12);
    
    // Find role
    const roles = await prisma.role.findMany();
    let role = roles.find(r => r.name.toLowerCase().includes('owner'));
    
    if (!role) {
      role = await prisma.role.create({
        data: { name: 'platform_owner' }
      });
    }

    const user = await prisma.user.upsert({
      where: { email: 'owner@gmail.com' },
      update: { password: hashedPassword, roleId: role.id },
      create: {
        name: 'Platform Owner',
        email: 'owner@gmail.com',
        password: hashedPassword,
        roleId: role.id,
        status: 'active'
      }
    });

    console.log("User created:", user.email, "with role:", role.name);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
