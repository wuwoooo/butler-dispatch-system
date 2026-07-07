-- 管家档案只保留调配所需的车辆信息，移除不参与业务的个人资料字段。
DROP INDEX `Butler_idCardNo_key` ON `Butler`;

ALTER TABLE `Butler`
    DROP COLUMN `emergencyContact`,
    DROP COLUMN `emergencyPhone`,
    DROP COLUMN `idCardNo`,
    DROP COLUMN `serviceArea`,
    ADD COLUMN `vehicleInfo` VARCHAR(128) NULL;
