/*
  Warnings:

  - Made the column `settlementStatus` on table `ServiceOrder` required. This step will fail if there are existing NULL values in that column.

*/
UPDATE `ServiceOrder`
SET `settlementStatus` = 'unsettled'
WHERE `settlementStatus` IS NULL;

-- AlterTable
ALTER TABLE `ServiceOrder` ADD COLUMN `settledAt` DATETIME(3) NULL,
    ADD COLUMN `settledById` VARCHAR(191) NULL,
    MODIFY `settlementStatus` ENUM('unsettled', 'settled') NOT NULL DEFAULT 'unsettled';

-- CreateTable
CREATE TABLE `AbnormalRecord` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `butlerId` VARCHAR(191) NULL,
    `abnormalType` VARCHAR(64) NOT NULL,
    `description` VARCHAR(1000) NOT NULL,
    `status` ENUM('pending', 'processing', 'resolved', 'ignored') NOT NULL DEFAULT 'pending',
    `handledById` VARCHAR(191) NULL,
    `handledAt` DATETIME(3) NULL,
    `handleResult` VARCHAR(1000) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AbnormalRecord_orderId_idx`(`orderId`),
    INDEX `AbnormalRecord_butlerId_idx`(`butlerId`),
    INDEX `AbnormalRecord_status_idx`(`status`),
    INDEX `AbnormalRecord_abnormalType_idx`(`abnormalType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServiceOrder` ADD CONSTRAINT `ServiceOrder_settledById_fkey` FOREIGN KEY (`settledById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbnormalRecord` ADD CONSTRAINT `AbnormalRecord_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `ServiceOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbnormalRecord` ADD CONSTRAINT `AbnormalRecord_butlerId_fkey` FOREIGN KEY (`butlerId`) REFERENCES `Butler`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbnormalRecord` ADD CONSTRAINT `AbnormalRecord_handledById_fkey` FOREIGN KEY (`handledById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbnormalRecord` ADD CONSTRAINT `AbnormalRecord_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
