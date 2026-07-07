-- CreateTable
CREATE TABLE `HotelRoomType` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NULL,
    `name` VARCHAR(64) NOT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `remark` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HotelRoomType_hotelId_enabled_idx`(`hotelId`, `enabled`),
    UNIQUE INDEX `HotelRoomType_hotelId_name_key`(`hotelId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HotelRoomType` ADD CONSTRAINT `HotelRoomType_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
