-- 将“当前服务状态”与“是否允许接新单”分离，避免编辑资料覆盖订单状态。
ALTER TABLE `Butler`
    ADD COLUMN `dispatchEnabled` BOOLEAN NOT NULL DEFAULT true;

-- 旧暂停状态迁移为“暂停接新单”；服务状态随后由订单和请假刷新逻辑计算。
UPDATE `Butler`
SET `dispatchEnabled` = false,
    `status` = 'available'
WHERE `status` = 'suspended';

-- 停用管家继续保持不可接单。
UPDATE `Butler`
SET `dispatchEnabled` = false
WHERE `status` = 'disabled';
