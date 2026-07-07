-- 为后台账号和微信小程序绑定补充登录元数据。
ALTER TABLE `User`
    ADD COLUMN `lastMiniProgramLoginAt` DATETIME(3) NULL,
    ADD COLUMN `miniProgramBoundAt` DATETIME(3) NULL,
    ADD COLUMN `remark` VARCHAR(500) NULL,
    ADD COLUMN `wechatOpenId` VARCHAR(128) NULL,
    ADD COLUMN `wechatUnionId` VARCHAR(128) NULL;

-- openid 允许为空，但非空值必须只能绑定到一个系统账号。
CREATE UNIQUE INDEX `User_wechatOpenId_key` ON `User`(`wechatOpenId`);
CREATE INDEX `User_miniProgramBoundAt_idx` ON `User`(`miniProgramBoundAt`);
