-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `profileImage` VARCHAR(191) NULL,
    `lastLogin` DATETIME(3) NULL,
    `departmentId` VARCHAR(191) NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Permission_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`roleId`, `permissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Department` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Department_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshToken_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SystemSetting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierConnection` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `apiUrl` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'disconnected',
    `lastSync` DATETIME(3) NULL,
    `nextSync` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierCredential` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `authType` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `apiKey` VARCHAR(191) NULL,
    `secret` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierSync` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `productCount` INTEGER NOT NULL DEFAULT 0,
    `inventoryStatus` VARCHAR(191) NULL,
    `pricingStatus` VARCHAR(191) NULL,
    `imageStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierLog` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `cronExpression` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `upc` VARCHAR(191) NULL,
    `barcode` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `shortDescription` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `slug` VARCHAR(191) NULL,
    `seoTitle` VARCHAR(191) NULL,
    `seoDescription` VARCHAR(191) NULL,
    `weight` DOUBLE NULL,
    `dimensions` VARCHAR(191) NULL,
    `supplierId` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NULL,
    `brandId` VARCHAR(191) NULL,
    `manufacturerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Product_sku_key`(`sku`),
    UNIQUE INDEX `Product_upc_key`(`upc`),
    UNIQUE INDEX `Product_barcode_key`(`barcode`),
    UNIQUE INDEX `Product_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `seoTitle` VARCHAR(191) NULL,
    `seoDescription` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Brand` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `logo` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `website` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Brand_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Manufacturer` (
    `id` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Manufacturer_company_key`(`company`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Variant` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NULL,
    `size` VARCHAR(191) NULL,
    `material` VARCHAR(191) NULL,
    `storage` VARCHAR(191) NULL,
    `memory` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `dynamicOptions` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Variant_sku_key`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attribute` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `group` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'text',
    `dynamicValues` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Media` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `folder` VARCHAR(191) NULL,
    `filename` VARCHAR(191) NOT NULL,
    `size` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductImage` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductPrice` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `variantId` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `cost` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inventory` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `variantId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'in_stock',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Store` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `connectionStatus` VARCHAR(191) NOT NULL DEFAULT 'disconnected',
    `syncStatus` VARCHAR(191) NOT NULL DEFAULT 'idle',
    `lastSync` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreConfiguration` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreCredential` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `apiKey` VARCHAR(191) NULL,
    `secret` VARCHAR(191) NULL,
    `accessToken` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoryMapping` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `supplierValue` VARCHAR(191) NOT NULL,
    `storeValue` VARCHAR(191) NULL,
    `manualOverride` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'mapped',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BrandMapping` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `supplierValue` VARCHAR(191) NOT NULL,
    `storeValue` VARCHAR(191) NULL,
    `manualOverride` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'mapped',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VariantMapping` (
    `id` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `supplierValue` VARCHAR(191) NOT NULL,
    `storeValue` VARCHAR(191) NULL,
    `manualOverride` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'mapped',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttributeMapping` (
    `id` VARCHAR(191) NOT NULL,
    `attributeId` VARCHAR(191) NOT NULL,
    `supplierValue` VARCHAR(191) NOT NULL,
    `storeValue` VARCHAR(191) NULL,
    `manualOverride` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'mapped',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductMapping` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `supplierValue` VARCHAR(191) NOT NULL,
    `storeValue` VARCHAR(191) NULL,
    `manualOverride` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'mapped',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportJob` (
    `id` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `recordsProcessed` INTEGER NOT NULL DEFAULT 0,
    `recordsFailed` INTEGER NOT NULL DEFAULT 0,
    `logs` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierConnection` ADD CONSTRAINT `SupplierConnection_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierCredential` ADD CONSTRAINT `SupplierCredential_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierSync` ADD CONSTRAINT `SupplierSync_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierLog` ADD CONSTRAINT `SupplierLog_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierSchedule` ADD CONSTRAINT `SupplierSchedule_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_manufacturerId_fkey` FOREIGN KEY (`manufacturerId`) REFERENCES `Manufacturer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Variant` ADD CONSTRAINT `Variant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPrice` ADD CONSTRAINT `ProductPrice_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPrice` ADD CONSTRAINT `ProductPrice_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `Variant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `Variant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreConfiguration` ADD CONSTRAINT `StoreConfiguration_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreCredential` ADD CONSTRAINT `StoreCredential_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryMapping` ADD CONSTRAINT `CategoryMapping_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BrandMapping` ADD CONSTRAINT `BrandMapping_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VariantMapping` ADD CONSTRAINT `VariantMapping_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `Variant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttributeMapping` ADD CONSTRAINT `AttributeMapping_attributeId_fkey` FOREIGN KEY (`attributeId`) REFERENCES `Attribute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductMapping` ADD CONSTRAINT `ProductMapping_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
