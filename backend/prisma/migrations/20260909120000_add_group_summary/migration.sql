-- CreateTable
CREATE TABLE "GroupSummary" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "totalSpentMinorUnits" BIGINT NOT NULL,
    "expenseCount" INTEGER NOT NULL,
    "settlementCount" INTEGER NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'PKR',
    "computedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupSummary_groupId_key" ON "GroupSummary"("groupId");

-- AddForeignKey
ALTER TABLE "GroupSummary" ADD CONSTRAINT "GroupSummary_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;