/*
  Warnings:

  - The primary key for the `Coins` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "Coins" DROP CONSTRAINT "Coins_pkey",
ADD CONSTRAINT "Coins_pkey" PRIMARY KEY ("guildId", "userId");
