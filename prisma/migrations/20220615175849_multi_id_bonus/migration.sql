/*
  Warnings:

  - The primary key for the `Bonus` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `guildId` on table `Bonus` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Bonus" DROP CONSTRAINT "Bonus_pkey",
ALTER COLUMN "guildId" SET NOT NULL,
ADD CONSTRAINT "Bonus_pkey" PRIMARY KEY ("guildId", "userId");
