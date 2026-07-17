-- CreateTable
CREATE TABLE `HotelRoom` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `roomTypeId` VARCHAR(191) NOT NULL,
    `roomNo` VARCHAR(64) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `remark` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HotelRoom_hotelId_roomNo_key`(`hotelId`, `roomNo`),
    INDEX `HotelRoom_roomTypeId_enabled_idx`(`roomTypeId`, `enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `HotelRoomType_hotelId_code_key` ON `HotelRoomType`(`hotelId`, `code`);

-- AddForeignKey
ALTER TABLE `HotelRoom` ADD CONSTRAINT `HotelRoom_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelRoom` ADD CONSTRAINT `HotelRoom_roomTypeId_fkey` FOREIGN KEY (`roomTypeId`) REFERENCES `HotelRoomType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
