/*
  Warnings:

  - The primary key for the `Reminder` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `reminderId` to the `Reminder` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `dueTimestamp` on the `Reminder` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Reminder" DROP CONSTRAINT "Reminder_pkey",
ADD COLUMN     "channel" TEXT,
ADD COLUMN     "reminderId" INTEGER NOT NULL,
ALTER COLUMN "guild" DROP NOT NULL,
DROP COLUMN "dueTimestamp",
ADD COLUMN     "dueTimestamp" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "Reminder_pkey" PRIMARY KEY ("reminderId", "userId");
