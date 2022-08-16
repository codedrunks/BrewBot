/*
  Warnings:

  - The primary key for the `Reminder` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `dueTimestamp` on the `Reminder` table. All the data in the column will be lost.
  - Added the required column `dueTime` to the `Reminder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reminderId` to the `Reminder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reminder" DROP CONSTRAINT "Reminder_pkey",
DROP COLUMN "dueTimestamp",
ADD COLUMN     "channel" TEXT,
ADD COLUMN     "dueTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "reminderId" INTEGER NOT NULL,
ALTER COLUMN "guild" DROP NOT NULL,
ADD CONSTRAINT "Reminder_pkey" PRIMARY KEY ("reminderId", "userId");
