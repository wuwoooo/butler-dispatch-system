-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `code` ENUM('admin', 'hotel_frontdesk', 'dispatcher', 'butler', 'finance') NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(64) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `roleCode` ENUM('admin', 'hotel_frontdesk', 'dispatcher', 'butler', 'finance') NOT NULL,
    `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    `hotelId` VARCHAR(191) NULL,
    `butlerId` VARCHAR(191) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_phone_key`(`phone`),
    UNIQUE INDEX `User_butlerId_key`(`butlerId`),
    INDEX `User_roleCode_idx`(`roleCode`),
    INDEX `User_hotelId_idx`(`hotelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Hotel` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `address` VARCHAR(255) NULL,
    `contactName` VARCHAR(64) NULL,
    `contactPhone` VARCHAR(32) NULL,
    `phone` VARCHAR(32) NULL,
    `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Hotel_code_key`(`code`),
    UNIQUE INDEX `Hotel_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Butler` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `gender` VARCHAR(16) NULL,
    `idCardNo` VARCHAR(32) NULL,
    `serviceArea` VARCHAR(128) NULL,
    `emergencyContact` VARCHAR(64) NULL,
    `emergencyPhone` VARCHAR(32) NULL,
    `status` ENUM('available', 'pending_confirm', 'confirmed_waiting', 'in_service', 'on_leave', 'suspended', 'disabled') NOT NULL DEFAULT 'available',
    `remark` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Butler_code_key`(`code`),
    UNIQUE INDEX `Butler_phone_key`(`phone`),
    UNIQUE INDEX `Butler_idCardNo_key`(`idCardNo`),
    INDEX `Butler_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceOrder` (
    `id` VARCHAR(191) NOT NULL,
    `orderNo` VARCHAR(64) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `guestName` VARCHAR(64) NOT NULL,
    `guestPhone` VARCHAR(32) NOT NULL,
    `guestCount` INTEGER NOT NULL DEFAULT 1,
    `checkInDate` DATETIME(3) NOT NULL,
    `checkOutDate` DATETIME(3) NULL,
    `pickupType` ENUM('airport', 'train') NOT NULL,
    `arrivalTime` DATETIME(3) NOT NULL,
    `arrivalStation` VARCHAR(128) NOT NULL,
    `flightTrainNo` VARCHAR(64) NULL,
    `destination` VARCHAR(128) NULL,
    `status` ENUM('pending_dispatch', 'pending_confirm', 'partial_rejected', 'confirmed', 'in_service', 'pending_review', 'reviewed', 'completed', 'cancelled', 'abnormal') NOT NULL DEFAULT 'pending_dispatch',
    `remark` VARCHAR(1000) NULL,
    `settlementAmount` DECIMAL(12, 2) NULL,
    `settlementStatus` VARCHAR(64) NULL,
    `settlementRemark` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceOrder_orderNo_key`(`orderNo`),
    INDEX `ServiceOrder_hotelId_idx`(`hotelId`),
    INDEX `ServiceOrder_status_idx`(`status`),
    INDEX `ServiceOrder_arrivalTime_idx`(`arrivalTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderButlerAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `butlerId` VARCHAR(191) NOT NULL,
    `role` ENUM('primary', 'assistant') NOT NULL DEFAULT 'assistant',
    `status` ENUM('pending_confirm', 'confirmed', 'rejected', 'picked_guest', 'in_service', 'completed', 'abnormal', 'reassigned') NOT NULL DEFAULT 'pending_confirm',
    `assignedById` VARCHAR(191) NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `pickedGuestAt` DATETIME(3) NULL,
    `serviceStartedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `reassignedAt` DATETIME(3) NULL,
    `rejectReason` VARCHAR(500) NULL,
    `remark` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OrderButlerAssignment_butlerId_idx`(`butlerId`),
    INDEX `OrderButlerAssignment_status_idx`(`status`),
    UNIQUE INDEX `OrderButlerAssignment_orderId_butlerId_key`(`orderId`, `butlerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RejectRecord` (
    `id` VARCHAR(191) NOT NULL,
    `assignmentId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `butlerId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RejectRecord_orderId_idx`(`orderId`),
    INDEX `RejectRecord_butlerId_idx`(`butlerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ButlerLeave` (
    `id` VARCHAR(191) NOT NULL,
    `butlerId` VARCHAR(191) NOT NULL,
    `leaveType` VARCHAR(64) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected', 'cancelled', 'active', 'finished') NOT NULL DEFAULT 'pending',
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewRemark` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ButlerLeave_butlerId_idx`(`butlerId`),
    INDEX `ButlerLeave_status_idx`(`status`),
    INDEX `ButlerLeave_startAt_endAt_idx`(`startAt`, `endAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceReview` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `assignmentId` VARCHAR(191) NOT NULL,
    `butlerId` VARCHAR(191) NOT NULL,
    `reviewerId` VARCHAR(191) NOT NULL,
    `reviewerRole` ENUM('admin', 'hotel_frontdesk', 'dispatcher', 'butler', 'finance') NOT NULL,
    `score` INTEGER NOT NULL,
    `content` VARCHAR(1000) NULL,
    `tags` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceReview_orderId_idx`(`orderId`),
    INDEX `ServiceReview_butlerId_idx`(`butlerId`),
    UNIQUE INDEX `ServiceReview_assignmentId_reviewerId_key`(`assignmentId`, `reviewerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `recipientId` VARCHAR(191) NULL,
    `title` VARCHAR(128) NOT NULL,
    `content` VARCHAR(1000) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Notification_recipientId_isRead_idx`(`recipientId`, `isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OperationLog` (
    `id` VARCHAR(191) NOT NULL,
    `operatorId` VARCHAR(191) NULL,
    `operationType` VARCHAR(64) NOT NULL,
    `targetType` VARCHAR(64) NOT NULL,
    `targetId` VARCHAR(128) NULL,
    `beforeData` JSON NULL,
    `afterData` JSON NULL,
    `remark` VARCHAR(500) NULL,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OperationLog_operatorId_idx`(`operatorId`),
    INDEX `OperationLog_operationType_idx`(`operationType`),
    INDEX `OperationLog_targetType_targetId_idx`(`targetType`, `targetId`),
    INDEX `OperationLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemDict` (
    `id` VARCHAR(191) NOT NULL,
    `dictType` VARCHAR(64) NOT NULL,
    `label` VARCHAR(64) NOT NULL,
    `value` VARCHAR(64) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `remark` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SystemDict_dictType_enabled_idx`(`dictType`, `enabled`),
    UNIQUE INDEX `SystemDict_dictType_value_key`(`dictType`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_butlerId_fkey` FOREIGN KEY (`butlerId`) REFERENCES `Butler`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceOrder` ADD CONSTRAINT `ServiceOrder_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceOrder` ADD CONSTRAINT `ServiceOrder_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderButlerAssignment` ADD CONSTRAINT `OrderButlerAssignment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `ServiceOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderButlerAssignment` ADD CONSTRAINT `OrderButlerAssignment_butlerId_fkey` FOREIGN KEY (`butlerId`) REFERENCES `Butler`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderButlerAssignment` ADD CONSTRAINT `OrderButlerAssignment_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RejectRecord` ADD CONSTRAINT `RejectRecord_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `OrderButlerAssignment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RejectRecord` ADD CONSTRAINT `RejectRecord_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `ServiceOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RejectRecord` ADD CONSTRAINT `RejectRecord_butlerId_fkey` FOREIGN KEY (`butlerId`) REFERENCES `Butler`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RejectRecord` ADD CONSTRAINT `RejectRecord_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ButlerLeave` ADD CONSTRAINT `ButlerLeave_butlerId_fkey` FOREIGN KEY (`butlerId`) REFERENCES `Butler`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ButlerLeave` ADD CONSTRAINT `ButlerLeave_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceReview` ADD CONSTRAINT `ServiceReview_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `ServiceOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceReview` ADD CONSTRAINT `ServiceReview_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `OrderButlerAssignment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceReview` ADD CONSTRAINT `ServiceReview_butlerId_fkey` FOREIGN KEY (`butlerId`) REFERENCES `Butler`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceReview` ADD CONSTRAINT `ServiceReview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OperationLog` ADD CONSTRAINT `OperationLog_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
