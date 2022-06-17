-- AlterTable
ALTER TABLE "ContestSubmission" ALTER COLUMN "votes" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Guild" ALTER COLUMN "contestRoleId" DROP NOT NULL,
ALTER COLUMN "contestChannelId" DROP NOT NULL;
