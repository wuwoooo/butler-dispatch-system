-- 为管家增加可用于推荐的标准车型分类。
ALTER TABLE `Butler`
    ADD COLUMN `vehicleType` ENUM('sedan', 'suv', 'business') NULL;

-- 交通订单使用精确服务时段，既有住店订单保持原服务窗口。
ALTER TABLE `ServiceOrder`
    ADD COLUMN `serviceMode` ENUM('stay', 'transport') NOT NULL DEFAULT 'stay',
    ADD COLUMN `transportDirection` ENUM('pickup', 'dropoff') NULL,
    ADD COLUMN `serviceStartAt` DATETIME(3) NULL,
    ADD COLUMN `serviceEndAt` DATETIME(3) NULL,
    ADD COLUMN `requestedVehicleType` ENUM('sedan', 'suv', 'business') NULL,
    ADD COLUMN `requestedVehicleInfo` VARCHAR(128) NULL,
    ADD COLUMN `importFingerprint` VARCHAR(64) NULL,
    ADD COLUMN `importSourceFile` VARCHAR(255) NULL,
    ADD COLUMN `importSourceSheet` VARCHAR(128) NULL,
    ADD COLUMN `importSourceRow` INTEGER NULL;

UPDATE `ServiceOrder`
SET
    `serviceStartAt` = LEAST(`checkInDate`, `arrivalTime`),
    `serviceEndAt` = DATE_SUB(
        DATE_ADD(DATE(`checkOutDate`), INTERVAL 1 DAY),
        INTERVAL 1000 MICROSECOND
    );

ALTER TABLE `ServiceOrder`
    MODIFY `serviceStartAt` DATETIME(3) NOT NULL,
    MODIFY `serviceEndAt` DATETIME(3) NOT NULL;

CREATE UNIQUE INDEX `ServiceOrder_importFingerprint_key`
    ON `ServiceOrder`(`importFingerprint`);
CREATE INDEX `ServiceOrder_serviceStartAt_idx`
    ON `ServiceOrder`(`serviceStartAt`);
CREATE INDEX `ServiceOrder_serviceEndAt_idx`
    ON `ServiceOrder`(`serviceEndAt`);
CREATE INDEX `ServiceOrder_serviceMode_idx`
    ON `ServiceOrder`(`serviceMode`);

-- 只对能安全识别的存量车型生成候选分类，未知车型保持 NULL 等待人工复核。
UPDATE `Butler`
SET `vehicleType` = CASE
    WHEN UPPER(`vehicleInfo`) LIKE '%SUV%' THEN 'suv'
    WHEN UPPER(`vehicleInfo`) LIKE '%GL8%'
      OR UPPER(`vehicleInfo`) LIKE '%M8%'
      OR UPPER(`vehicleInfo`) LIKE '%MPV%'
      OR `vehicleInfo` LIKE '%商务%'
      OR `vehicleInfo` LIKE '%赛那%'
      OR `vehicleInfo` LIKE '%奥德赛%'
      OR `vehicleInfo` LIKE '%大霸王%' THEN 'business'
    WHEN `vehicleInfo` LIKE '%轿车%'
      OR `vehicleInfo` LIKE '%迈腾%' THEN 'sedan'
    ELSE NULL
END
WHERE `vehicleInfo` IS NOT NULL;
