/*
  Warnings:

  - You are about to drop the column `coins` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Bonus" ADD COLUMN     "guildId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "coins";

-- CreateTable
CREATE TABLE "Coins" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Coins_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "Coins" ADD CONSTRAINT "Coins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
