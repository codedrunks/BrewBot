-- DropForeignKey
ALTER TABLE "Guild" DROP CONSTRAINT IF EXISTS "Guild_id_fkey";

-- CreateTable
CREATE TABLE IF NOT EXISTS "TwentyFortyEightLeaderboardEntry" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TwentyFortyEightLeaderboardEntry_pkey" PRIMARY KEY ("guildId","userId")
);

-- AddForeignKey
ALTER TABLE "GuildSettings" DROP CONSTRAINT IF EXISTS "GuildSettings_guildId_fkey";
ALTER TABLE "GuildSettings" ADD CONSTRAINT "GuildSettings_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwentyFortyEightLeaderboardEntry" DROP CONSTRAINT IF EXISTS "TwentyFortyEightLeaderboardEntry_guildId_userId_fkey";
ALTER TABLE "TwentyFortyEightLeaderboardEntry" ADD CONSTRAINT "TwentyFortyEightLeaderboardEntry_guildId_userId_fkey" FOREIGN KEY ("guildId", "userId") REFERENCES "Member"("guildId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
