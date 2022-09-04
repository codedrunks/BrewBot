/*
  Warnings:

  - You are about to drop the column `memberId` on the `Bonus` table. All the data in the column will be lost.
  - You are about to drop the column `memberId` on the `Coins` table. All the data in the column will be lost.
  - The primary key for the `Warning` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "Bonus" DROP COLUMN "memberId";

-- AlterTable
ALTER TABLE "Coins" DROP COLUMN "memberId";

-- AlterTable
ALTER TABLE "Warning" DROP CONSTRAINT "Warning_pkey",
ADD CONSTRAINT "Warning_pkey" PRIMARY KEY ("warningId", "userId", "guildId");
