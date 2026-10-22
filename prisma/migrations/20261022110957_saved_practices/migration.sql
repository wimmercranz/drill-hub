-- CreateTable
CREATE TABLE "PracticeTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "PracticeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeTemplateItem" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "templateId" TEXT NOT NULL,
    "drillId" TEXT NOT NULL,

    CONSTRAINT "PracticeTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticeTemplate_ownerId_title_key" ON "PracticeTemplate"("ownerId", "title");

-- AddForeignKey
ALTER TABLE "PracticeTemplate" ADD CONSTRAINT "PracticeTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTemplateItem" ADD CONSTRAINT "PracticeTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PracticeTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTemplateItem" ADD CONSTRAINT "PracticeTemplateItem_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "Drill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
