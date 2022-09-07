/*
  Warnings:

  - You are about to drop the column `contestChannelId` on the `Guild` table. All the data in the column will be lost.
  - You are about to drop the column `contestRoleId` on the `Guild` table. All the data in the column will be lost.
  - You are about to drop the column `djOnly` on the `Guild` table. All the data in the column will be lost.
  - You are about to drop the column `djRoleIds` on the `Guild` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Bonus" DROP CONSTRAINT IF EXISTS "Bonus_userId_fkey";

-- DropForeignKey
ALTER TABLE "Coins" DROP CONSTRAINT IF EXISTS "Coins_userId_fkey";

-- AlterTable
ALTER TABLE "Bonus" ADD COLUMN IF NOT EXISTS "memberId" TEXT;

-- AlterTable
ALTER TABLE "Coins" ADD COLUMN IF NOT EXISTS "memberId" TEXT;

-- AlterTable
ALTER TABLE "Guild" DROP COLUMN IF EXISTS "contestChannelId",
DROP COLUMN IF EXISTS "contestRoleId",
DROP COLUMN IF EXISTS "djOnly",
DROP COLUMN IF EXISTS "djRoleIds",
ADD COLUMN IF NOT EXISTS "lastLogColor" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Member" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("guildId","userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Warning" (
    "warningId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "warnedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warning_pkey" PRIMARY KEY ("warningId","userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GuildSettings" (
    "guildId" TEXT NOT NULL,
    "contestRoleId" TEXT,
    "contestChannelId" TEXT,
    "djRoleIds" TEXT[],
    "djOnly" BOOLEAN DEFAULT false,
    "botLogChannel" TEXT,
    "warningThreshold" INTEGER NOT NULL DEFAULT 3,
    "banVoteAmt" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "GuildSettings_pkey" PRIMARY KEY ("guildId")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Member_guildId_userId_key" ON "Member"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_id_key" ON "User"("id");

-- AddForeignKey
ALTER TABLE "Warning" DROP CONSTRAINT IF EXISTS "Warning_userId_guildId_fkey";
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_userId_guildId_fkey" FOREIGN KEY ("userId", "guildId") REFERENCES "Member"("userId", "guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bonus" DROP CONSTRAINT IF EXISTS "Bonus_userId_guildId_fkey";
ALTER TABLE "Bonus" ADD CONSTRAINT "Bonus_userId_guildId_fkey" FOREIGN KEY ("userId", "guildId") REFERENCES "Member"("userId", "guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coins" DROP CONSTRAINT IF EXISTS "Coins_userId_guildId_fkey";
ALTER TABLE "Coins" ADD CONSTRAINT "Coins_userId_guildId_fkey" FOREIGN KEY ("userId", "guildId") REFERENCES "Member"("userId", "guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" DROP CONSTRAINT IF EXISTS "Guild_id_fkey";
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_id_fkey" FOREIGN KEY ("id") REFERENCES "GuildSettings"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
