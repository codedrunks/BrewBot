-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "premium" BOOLEAN DEFAULT false,
ALTER COLUMN "djOnly" SET DEFAULT false;
