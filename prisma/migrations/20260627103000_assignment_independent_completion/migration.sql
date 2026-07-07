ALTER TABLE `ServiceOrder`
    MODIFY COLUMN `status` ENUM('pending_dispatch', 'pending_confirm', 'partial_rejected', 'confirmed', 'in_service', 'partial_completed', 'pending_review', 'reviewed', 'completed', 'cancelled', 'abnormal') NOT NULL DEFAULT 'pending_dispatch';

UPDATE `ServiceOrder`
SET `checkOutDate` = DATE_ADD(GREATEST(`arrivalTime`, `checkInDate`), INTERVAL 1 DAY)
WHERE `checkOutDate` IS NULL;

ALTER TABLE `ServiceOrder`
    MODIFY COLUMN `checkOutDate` DATETIME(3) NOT NULL;

ALTER TABLE `OrderButlerAssignment`
    DROP COLUMN `role`;
