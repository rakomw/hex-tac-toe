import type {
  AdminLongestGameInDuration,
  AdminLongestGameInMoves,
  AdminStatsResponse,
  AdminStatsWindow
} from '@ih3t/shared'

interface AdminStatsScreenProps {
  stats: AdminStatsResponse | null
  isLoading: boolean
  errorMessage: string | null
  onBack: () => void
  onRefresh: () => void
  onOpenGame: (gameId: string) => void
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(timestamp)
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }

  return `${seconds}s`
}

function SummaryCard({
  label,
  value,
  tone = 'default'
}: {
  label: string
  value: string | number
  tone?: 'default' | 'accent'
}) {
  return (
    <div className={`rounded-[1.5rem] border p-5 shadow-lg ${tone === 'accent'
      ? 'border-amber-300/25 bg-amber-300/10'
      : 'border-white/10 bg-white/6'
      }`}>
      <div className="text-xs uppercase tracking-[0.28em] text-slate-300">{label}</div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
    </div>
  )
}

function LongestGameCard({
  label,
  emptyLabel,
  game,
  value,
  onOpenGame
}: {
  label: string
  emptyLabel: string
  game: AdminLongestGameInMoves | AdminLongestGameInDuration | null
  value: string | null
  onOpenGame: (gameId: string) => void
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</div>
      {game && value ? (
        <>
          <div className="mt-3 text-2xl font-bold text-white">{value}</div>
          <div className="mt-2 text-sm text-slate-300">{game.players.join(' vs ') || game.sessionId}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{game.sessionId}</div>
          <div className="mt-1 text-sm text-slate-400">Finished {formatDateTime(game.finishedAt)}</div>
          <button
            onClick={() => onOpenGame(game.gameId)}
            className="mt-4 rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-100 transition hover:bg-sky-400/20"
          >
            Open Replay
          </button>
        </>
      ) : (
        <div className="mt-3 text-sm text-slate-400">{emptyLabel}</div>
      )}
    </div>
  )
}

function IntervalSection({
  title,
  windowStats,
  onOpenGame
}: {
  title: string
  windowStats: AdminStatsWindow
  onOpenGame: (gameId: string) => void
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-sky-200/80">{title}</div>
          <div className="mt-2 text-sm text-slate-400">
            {formatDateTime(windowStats.startAt)} to {formatDateTime(windowStats.endAt)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
          Games played: <span className="font-bold text-white">{windowStats.gamesPlayed}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <SummaryCard label="Site Visits" value={windowStats.siteVisits} tone="accent" />
        <LongestGameCard
          label="Longest Game In Moves"
          emptyLabel="No completed games in this interval yet."
          game={windowStats.longestGameInMoves}
          value={windowStats.longestGameInMoves ? `${windowStats.longestGameInMoves.moveCount} moves` : null}
          onOpenGame={onOpenGame}
        />
        <LongestGameCard
          label="Longest Game In Duration"
          emptyLabel="No completed timed results in this interval yet."
          game={windowStats.longestGameInDuration}
          value={windowStats.longestGameInDuration ? formatDuration(windowStats.longestGameInDuration.durationMs) : null}
          onOpenGame={onOpenGame}
        />
      </div>
    </section>
  )
}

function AdminStatsScreen({
  stats,
  isLoading,
  errorMessage,
  onBack,
  onRefresh,
  onOpenGame
}: AdminStatsScreenProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_right,_rgba(251,191,36,0.14),_transparent_24%),linear-gradient(145deg,_#0f172a,_#111827_42%,_#1f2937)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.45)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-sky-300/30 bg-sky-400/10 px-4 py-1 text-xs uppercase tracking-[0.32em] text-sky-100">
                Admin
              </div>
              <h1 className="mt-5 text-3xl font-black uppercase tracking-[0.08em] text-white sm:text-5xl">
                Site Statistics
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Live activity, traffic, and completed-game records across the main reporting windows.
              </p>
              {stats && (
                <div className="mt-4 text-sm text-slate-400">Last updated {formatDateTime(stats.generatedAt)}</div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={onRefresh}
                className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-900 transition hover:-translate-y-0.5 hover:bg-amber-200"
              >
                Refresh
              </button>
              <button
                onClick={onBack}
                className="rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/14"
              >
                Back To Lobby
              </button>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Active Games" value={stats?.activeGames.total ?? '...'} tone="accent" />
          <SummaryCard label="Public Games" value={stats?.activeGames.public ?? '...'} />
          <SummaryCard label="Private Games" value={stats?.activeGames.private ?? '...'} />
          <SummaryCard label="Connected Clients" value={stats?.connectedClients ?? '...'} />
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-[1.5rem] border border-rose-300/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {errorMessage}
          </div>
        )}

        {isLoading && !stats ? (
          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/6 px-6 py-10 text-center text-slate-300">
            Loading statistics...
          </div>
        ) : stats ? (
          <div className="mt-6 space-y-6">
            <IntervalSection title="Since Midnight" windowStats={stats.intervals.sinceMidnight} onOpenGame={onOpenGame} />
            <IntervalSection title="Last 24 Hours" windowStats={stats.intervals.last24Hours} onOpenGame={onOpenGame} />
            <IntervalSection title="Last 7 Days" windowStats={stats.intervals.last7Days} onOpenGame={onOpenGame} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default AdminStatsScreen
