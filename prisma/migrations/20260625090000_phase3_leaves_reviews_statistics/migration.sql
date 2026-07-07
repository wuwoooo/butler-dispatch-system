-- AlterTable
ALTER TABLE `Butler` ADD COLUMN `averageScore` DECIMAL(3, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `reviewCount` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `ServiceReview` ADD COLUMN `attitudeScore` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `communicationScore` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `complaintFlag` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `overallScore` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `punctualityScore` INTEGER NOT NULL DEFAULT 5,
    MODIFY `score` INTEGER NOT NULL DEFAULT 5;

-- CreateIndex
CREATE INDEX `ServiceReview_reviewerRole_idx` ON `ServiceReview`(`reviewerRole`);

-- CreateIndex
CREATE INDEX `ServiceReview_complaintFlag_idx` ON `ServiceReview`(`complaintFlag`);

-- CreateIndex
CREATE UNIQUE INDEX `ServiceReview_assignmentId_reviewerRole_key` ON `ServiceReview`(`assignmentId`, `reviewerRole`);
