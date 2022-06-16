-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "contestRoleId" TEXT NOT NULL,
    "contestChannelId" TEXT NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("guildId","id")
);

-- CreateTable
CREATE TABLE "ContestSubmission" (
    "userId" TEXT NOT NULL,
    "contestId" INTEGER NOT NULL,
    "guildId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "votes" INTEGER NOT NULL,

    CONSTRAINT "ContestSubmission_pkey" PRIMARY KEY ("guildId","contestId","userId")
);

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSubmission" ADD CONSTRAINT "ContestSubmission_guildId_contestId_fkey" FOREIGN KEY ("guildId", "contestId") REFERENCES "Contest"("guildId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
