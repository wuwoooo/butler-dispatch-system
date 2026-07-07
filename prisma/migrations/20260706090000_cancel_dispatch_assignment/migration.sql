ALTER TABLE `OrderButlerAssignment`
    ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    MODIFY COLUMN `status` ENUM('pending_confirm', 'confirmed', 'rejected', 'picked_guest', 'in_service', 'completed', 'abnormal', 'reassigned', 'cancelled') NOT NULL DEFAULT 'pending_confirm';
