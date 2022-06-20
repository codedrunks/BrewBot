/*
  Warnings:

  - You are about to drop the column `votes` on the `ContestSubmission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ContestSubmission" DROP COLUMN "votes";

-- CreateTable
CREATE TABLE "SubmissionVote" (
    "guildId" TEXT NOT NULL,
    "contestId" INTEGER NOT NULL,
    "contestantId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,

    CONSTRAINT "SubmissionVote_pkey" PRIMARY KEY ("guildId","contestId","contestantId","voterId")
);

-- AddForeignKey
ALTER TABLE "SubmissionVote" ADD CONSTRAINT "SubmissionVote_guildId_contestId_contestantId_fkey" FOREIGN KEY ("guildId", "contestId", "contestantId") REFERENCES "ContestSubmission"("guildId", "contestId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
