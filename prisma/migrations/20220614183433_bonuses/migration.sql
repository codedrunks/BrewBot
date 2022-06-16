-- AlterTable
ALTER TABLE "User" ALTER COLUMN "coins" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "Bonus" (
    "userId" TEXT NOT NULL,
    "lastdaily" INTEGER,
    "last2hour" INTEGER,
    "lastwork" INTEGER,

    CONSTRAINT "Bonus_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "Bonus" ADD CONSTRAINT "Bonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
