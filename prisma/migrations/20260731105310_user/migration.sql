-- CreateTable
CREATE TABLE `ValidationRule` (
    `id` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `field` VARCHAR(191) NOT NULL,
    `ruleType` VARCHAR(191) NOT NULL,
    `errorMessage` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ValidationLog` (
    `id` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `issue` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobLog` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `queueName` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `result` TEXT NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PublishingLog` (
    `id` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
