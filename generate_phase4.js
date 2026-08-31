const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prismaSchemaPath = path.join(__dirname, 'prisma', 'schema.prisma');

const schemaAdditions = `
// ==========================================
// PHASE 4: SIDEBAR CRUD (PRICING)
// ==========================================

model PricingRule {
  id          String   @id @default(uuid())
  name        String
  formula     String
  applies     String
  products    Int      @default(0)
  active      Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PricingAudit {
  id            String   @id @default(uuid())
  name          String
  sku           String
  supplier      String
  oldPrice      Float
  newPrice      Float
  wholesaleCost Float
  status        String   @default("pending")
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
`;

let currentSchema = fs.readFileSync(prismaSchemaPath, 'utf8');
if (!currentSchema.includes('model PricingRule {')) {
  fs.writeFileSync(prismaSchemaPath, currentSchema + '\n' + schemaAdditions);
  console.log('Schema updated successfully.');
} else {
  console.log('Schema already updated.');
}

console.log('Running Prisma push...');
try {
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Prisma migration and generation complete.');
} catch (error) {
  console.error('Prisma command failed:', error.message);
}
