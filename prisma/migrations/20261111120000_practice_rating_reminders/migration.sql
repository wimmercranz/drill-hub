-- AlterTable
ALTER TABLE "PracticePlan" ADD COLUMN     "ratingReminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "practiceRatingEmails" BOOLEAN NOT NULL DEFAULT true;
