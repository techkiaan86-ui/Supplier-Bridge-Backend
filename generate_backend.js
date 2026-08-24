const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prismaSchemaPath = path.join(__dirname, 'prisma', 'schema.prisma');

const schemaAdditions = `
// ==========================================
// PHASE 2: ENTERPRISE PIM PLATFORM
// ==========================================

// --- Supplier Management ---
model Supplier {
  id                String               @id @default(uuid())
  name              String
  company           String?
  email             String?
  phone             String?
  website           String?
  status            String               @default("active")
  
  connections       SupplierConnection[]
  credentials       SupplierCredential[]
  syncs             SupplierSync[]
  logs              SupplierLog[]
  schedules         SupplierSchedule[]
  products          Product[]
  
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  deletedAt         DateTime?
}

model SupplierConnection {
  id                String    @id @default(uuid())
  supplierId        String
  supplier          Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  type              String    // API, FTP, SFTP, SOAP, CSV, XML
  apiUrl            String?
  status            String    @default("disconnected")
  lastSync          DateTime?
  nextSync          DateTime?
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model SupplierCredential {
  id                String    @id @default(uuid())
  supplierId        String
  supplier          Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  authType          String    // basic, bearer, apikey
  username          String?
  password          String?
  apiKey            String?
  secret            String?
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model SupplierSync {
  id                String    @id @default(uuid())
  supplierId        String
  supplier          Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  status            String    // success, failed, in_progress
  productCount      Int       @default(0)
  inventoryStatus   String?
  pricingStatus     String?
  imageStatus       String?
  
  createdAt         DateTime  @default(now())
}

model SupplierLog {
  id                String    @id @default(uuid())
  supplierId        String
  supplier          Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  action            String
  details           String?   @db.Text
  status            String
  
  createdAt         DateTime  @default(now())
}

model SupplierSchedule {
  id                String    @id @default(uuid())
  supplierId        String
  supplier          Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  cronExpression    String
  isActive          Boolean   @default(true)
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

// --- Product Information Management ---
model Product {
  id                String    @id @default(uuid())
  sku               String    @unique
  upc               String?   @unique
  barcode           String?   @unique
  title             String
  description       String?   @db.Text
  shortDescription  String?
  status            String    @default("draft") // draft, published, archived
  slug              String?   @unique
  seoTitle          String?
  seoDescription    String?
  
  weight            Float?
  dimensions        String?
  
  supplierId        String?
  supplier          Supplier? @relation(fields: [supplierId], references: [id])
  
  categoryId        String?
  category          Category? @relation(fields: [categoryId], references: [id])
  
  brandId           String?
  brand             Brand?    @relation(fields: [brandId], references: [id])
  
  manufacturerId    String?
  manufacturer      Manufacturer? @relation(fields: [manufacturerId], references: [id])
  
  variants          Variant[]
  images            ProductImage[]
  prices            ProductPrice[]
  inventory         Inventory[]
  mappings          ProductMapping[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
}

model Category {
  id                String    @id @default(uuid())
  name              String
  slug              String    @unique
  parentId          String?
  parent            Category? @relation("CategoryToCategory", fields: [parentId], references: [id])
  children          Category[] @relation("CategoryToCategory")
  seoTitle          String?
  seoDescription    String?
  status            String    @default("active")
  
  products          Product[]
  mappings          CategoryMapping[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Brand {
  id                String    @id @default(uuid())
  name              String    @unique
  logo              String?
  description       String?   @db.Text
  website           String?
  status            String    @default("active")
  
  products          Product[]
  mappings          BrandMapping[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Manufacturer {
  id                String    @id @default(uuid())
  company           String    @unique
  country           String?
  contact           String?
  status            String    @default("active")
  
  products          Product[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Variant {
  id                String    @id @default(uuid())
  productId         String
  product           Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku               String    @unique
  color             String?
  size              String?
  material          String?
  storage           String?
  memory            String?
  model             String?
  dynamicOptions    String?   @db.Text // JSON string
  
  prices            ProductPrice[]
  inventory         Inventory[]
  mappings          VariantMapping[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Attribute {
  id                String    @id @default(uuid())
  name              String
  group             String?
  type              String    @default("text") // text, number, select
  dynamicValues     String?   @db.Text // JSON string for values
  
  mappings          AttributeMapping[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Media {
  id                String    @id @default(uuid())
  url               String
  type              String    // image, document, video
  folder            String?
  filename          String
  size              Int?
  
  createdAt         DateTime  @default(now())
}

model ProductImage {
  id                String    @id @default(uuid())
  productId         String
  product           Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  url               String
  isFeatured        Boolean   @default(false)
  order             Int       @default(0)
  
  createdAt         DateTime  @default(now())
}

model ProductPrice {
  id                String    @id @default(uuid())
  productId         String?
  product           Product?  @relation(fields: [productId], references: [id], onDelete: Cascade)
  variantId         String?
  variant           Variant?  @relation(fields: [variantId], references: [id], onDelete: Cascade)
  
  price             Float
  cost              Float?
  currency          String    @default("USD")
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Inventory {
  id                String    @id @default(uuid())
  productId         String?
  product           Product?  @relation(fields: [productId], references: [id], onDelete: Cascade)
  variantId         String?
  variant           Variant?  @relation(fields: [variantId], references: [id], onDelete: Cascade)
  
  quantity          Int       @default(0)
  status            String    @default("in_stock")
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

// --- Store Management ---
model Store {
  id                String    @id @default(uuid())
  name              String
  type              String    // shopify, magento, woocommerce, custom
  currency          String    @default("USD")
  language          String    @default("en")
  timezone          String    @default("UTC")
  connectionStatus  String    @default("disconnected")
  syncStatus        String    @default("idle")
  lastSync          DateTime?
  
  configurations    StoreConfiguration[]
  credentials       StoreCredential[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model StoreConfiguration {
  id                String    @id @default(uuid())
  storeId           String
  store             Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  key               String
  value             String    @db.Text
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model StoreCredential {
  id                String    @id @default(uuid())
  storeId           String
  store             Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  apiKey            String?
  secret            String?
  accessToken       String?
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

// --- Data Mapping & Import Engine ---
model CategoryMapping {
  id                String    @id @default(uuid())
  categoryId        String
  category          Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  supplierValue     String
  storeValue        String?
  manualOverride    Boolean   @default(false)
  status            String    @default("mapped")
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model BrandMapping {
  id                String    @id @default(uuid())
  brandId           String
  brand             Brand     @relation(fields: [brandId], references: [id], onDelete: Cascade)
  supplierValue     String
  storeValue        String?
  manualOverride    Boolean   @default(false)
  status            String    @default("mapped")
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model VariantMapping {
  id                String    @id @default(uuid())
  variantId         String
  variant           Variant   @relation(fields: [variantId], references: [id], onDelete: Cascade)
  supplierValue     String
  storeValue        String?
  manualOverride    Boolean   @default(false)
  status            String    @default("mapped")
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model AttributeMapping {
  id                String    @id @default(uuid())
  attributeId       String
  attribute         Attribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)
  supplierValue     String
  storeValue        String?
  manualOverride    Boolean   @default(false)
  status            String    @default("mapped")
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model ProductMapping {
  id                String    @id @default(uuid())
  productId         String
  product           Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  supplierValue     String
  storeValue        String?
  manualOverride    Boolean   @default(false)
  status            String    @default("mapped")
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model ImportJob {
  id                String    @id @default(uuid())
  source            String    // API, FTP, CSV, etc.
  type              String    // Products, Categories, Brands, Variants
  status            String    // pending, processing, completed, failed
  recordsProcessed  Int       @default(0)
  recordsFailed     Int       @default(0)
  logs              String?   @db.Text
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
`;

let currentSchema = fs.readFileSync(prismaSchemaPath, 'utf8');
if (!currentSchema.includes('model Supplier {')) {
  fs.writeFileSync(prismaSchemaPath, currentSchema + '\\n' + schemaAdditions);
  console.log('Schema updated successfully.');
} else {
  console.log('Schema already updated.');
}

console.log('Running Prisma commands...');
try {
  execSync('npx prisma migrate dev --name phase2_pim', { stdio: 'inherit' });
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Prisma migration and generation complete.');
} catch (error) {
  console.error('Prisma command failed:', error.message);
}
