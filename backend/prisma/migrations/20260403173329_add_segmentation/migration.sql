-- CreateTable
CREATE TABLE "ContactSegment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#10b981',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContactToSegment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContactToSegment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactSegment_tenantId_name_key" ON "ContactSegment"("tenantId", "name");

-- CreateIndex
CREATE INDEX "_ContactToSegment_B_index" ON "_ContactToSegment"("B");

-- AddForeignKey
ALTER TABLE "ContactSegment" ADD CONSTRAINT "ContactSegment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactToSegment" ADD CONSTRAINT "_ContactToSegment_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactToSegment" ADD CONSTRAINT "_ContactToSegment_B_fkey" FOREIGN KEY ("B") REFERENCES "ContactSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
