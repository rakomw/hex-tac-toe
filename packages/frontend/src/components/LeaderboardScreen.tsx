import type { Leaderboard } from '@ih3t/shared'
import { LeaderboardSection } from './LeaderboardPanel'
import PageCorpus from './PageCorpus'

interface LeaderboardScreenProps {
  leaderboard: Leaderboard | null
  isLoading: boolean
  errorMessage: string | null
  currentUsername: string | null
}

function LeaderboardScreen({
  leaderboard,
  isLoading,
  errorMessage,
  currentUsername,
}: Readonly<LeaderboardScreenProps>) {
  let inner;
  if (leaderboard) {
    inner = (
      <div className={"overscroll-contain px-4 pb-4 sm:px-6 sm:pb-6 flex flex-col overflow-auto"}>
        <LeaderboardSection
          leaderboard={leaderboard}
          isLoading={isLoading}
          currentUsername={currentUsername}

          title="Top 10 Players"
          eyebrow="ELO Leaderboard"
          description="Ranked by ELO from rated games and refreshed every 10 minutes."
          showSnapshot={false}
        />
      </div>
    )
  } else if (isLoading) {
    inner = (
      <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/6 px-6 py-10 text-center text-slate-300">
        Loading leaderboard...
      </div>
    )
  }

  return (
    <PageCorpus
      category={"Player Leaderboard"}
      title={"Highest rated players"}
      description={"Current ELO standings from rated games, refreshed on a 10 minute cache."}
    >
      {errorMessage && (
        <div className="mt-6 rounded-[1.5rem] border border-rose-300/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {errorMessage}
        </div>
      )}

      {inner}
    </PageCorpus >
  )
}

export default LeaderboardScreen
