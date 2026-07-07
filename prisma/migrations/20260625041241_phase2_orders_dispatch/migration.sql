-- AlterTable
ALTER TABLE `Butler` ADD COLUMN `rejectCount` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Notification` ADD COLUMN `targetId` VARCHAR(128) NULL,
    ADD COLUMN `targetType` VARCHAR(64) NULL;

-- AlterTable
ALTER TABLE `ServiceOrder` ADD COLUMN `roomNo` VARCHAR(64) NULL,
    ADD COLUMN `roomType` VARCHAR(64) NULL,
    ADD COLUMN `specialNeeds` VARCHAR(1000) NULL;

-- CreateIndex
CREATE INDEX `Notification_targetType_targetId_idx` ON `Notification`(`targetType`, `targetId`);
