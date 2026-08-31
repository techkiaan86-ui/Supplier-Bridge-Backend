const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prismaSchemaPath = path.join(__dirname, 'prisma', 'schema.prisma');

const schemaAdditions = `
// ==========================================
// PHASE 3: PRODUCTION READY / SYNC / QUEUES
// ==========================================

model ValidationRule {
  id                String    @id @default(uuid())
  entity            String    // Product, Supplier, Category
  field             String    // sku, images, price
  ruleType          String    // required, unique, format
  errorMessage      String
  isActive          Boolean   @default(true)
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model ValidationLog {
  id                String    @id @default(uuid())
  entityId          String    // ID of the invalid product/supplier
  entityType        String    // Product, Supplier
  issue             String    @db.Text
  status            String    @default("open") // open, resolved
  
  createdAt         DateTime  @default(now())
  resolvedAt        DateTime?
}

model JobLog {
  id                String    @id @default(uuid())
  jobId             String    // BullMQ job ID reference
  queueName         String    // Import, Sync, Publish
  status            String    // completed, failed, running
  progress          Int       @default(0)
  result            String?   @db.Text
  error             String?   @db.Text
  
  createdAt         DateTime  @default(now())
  completedAt       DateTime?
}

model PublishingLog {
  id                String    @id @default(uuid())
  storeId           String
  productId         String
  status            String    // success, failed
  details           String?   @db.Text
  
  createdAt         DateTime  @default(now())
}
`;

let currentSchema = fs.readFileSync(prismaSchemaPath, 'utf8');
if (!currentSchema.includes('model ValidationRule {')) {
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
