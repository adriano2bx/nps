/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,phoneNumber]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SurveyCampaign" ADD COLUMN     "ctaLabel" TEXT,
ADD COLUMN     "ctaLink" TEXT,
ADD COLUMN     "supportName" TEXT,
ADD COLUMN     "supportPhone" TEXT,
ADD COLUMN     "templateName" TEXT,
ADD COLUMN     "topicId" TEXT;

-- AlterTable
ALTER TABLE "SurveySession" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "BaileysSession" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "BaileysSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTopic" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactTopicOptOut" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactTopicOptOut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BaileysSession_channelId_idx" ON "BaileysSession"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "BaileysSession_channelId_key_key" ON "BaileysSession"("channelId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignTopic_tenantId_name_key" ON "CampaignTopic"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ContactTopicOptOut_contactId_topicId_key" ON "ContactTopicOptOut"("contactId", "topicId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_tenantId_phoneNumber_key" ON "Contact"("tenantId", "phoneNumber");

-- AddForeignKey
ALTER TABLE "SurveyCampaign" ADD CONSTRAINT "SurveyCampaign_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CampaignTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTopic" ADD CONSTRAINT "CampaignTopic_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactTopicOptOut" ADD CONSTRAINT "ContactTopicOptOut_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactTopicOptOut" ADD CONSTRAINT "ContactTopicOptOut_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CampaignTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
