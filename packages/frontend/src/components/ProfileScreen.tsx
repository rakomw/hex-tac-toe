import type { AccountProfile, AccountStatistics } from '@ih3t/shared'
import { toast } from 'react-toastify'
import { signInWithDiscord } from '../authClient'
import PageCorpus from './PageCorpus'

function showErrorToast(message: string) {
  toast.error(message, {
    toastId: `error:${message}`
  })
}

function formatWorldRank(worldRank: number | null) {
  return worldRank === null ? '--' : `#${worldRank}`
}

function formatWinSummary(won: number, played: number) {
  if (played <= 0) {
    return 'No finished games yet.'
  }

  const winRate = Math.round((won / played) * 100)
  return `${won} won · ${winRate}% win rate`
}

interface ProfileScreenProps {
  account: AccountProfile | null
  statistics: AccountStatistics | null
  isLoading: boolean
  isStatisticsLoading: boolean
  errorMessage: string | null
  statisticsErrorMessage: string | null
}

interface PrimaryStatCardProps {
  label: string
  value: string | number
  detail: string
  accentClassName: string
}

function PrimaryStatCard({ label, value, detail, accentClassName }: Readonly<PrimaryStatCardProps>) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
      <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${accentClassName}`}>{label}</div>
      <div className="mt-3 text-4xl font-black uppercase tracking-[0.04em] text-white sm:text-5xl">
        {value}
      </div>
      <div className="mt-3 text-sm leading-6 text-slate-300">{detail}</div>
    </div>
  )
}

interface SecondaryStatCardProps {
  label: string
  value: string | number
  detail: string
}

function SecondaryStatCard({ label, value, detail }: Readonly<SecondaryStatCardProps>) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/45 p-4">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black uppercase tracking-[0.05em] text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-300">{detail}</div>
    </div>
  )
}

function StatisticsLoadingState() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 px-5 py-10 text-center text-sm text-slate-300 lg:col-span-2">
        Loading your statistics...
      </div>
    </div>
  )
}

function StatisticsErrorState({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-[1.5rem] border border-rose-300/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
      {message}
    </div>
  )
}

function StatisticsEmptyState() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 px-5 py-10 text-center text-sm text-slate-300">
      Statistics will appear here once your profile data is ready.
    </div>
  )
}

function ProfileScreen({
  account,
  statistics,
  isLoading,
  isStatisticsLoading,
  errorMessage,
  statisticsErrorMessage
}: Readonly<ProfileScreenProps>) {
  const handleSignIn = async () => {
    try {
      await signInWithDiscord()
    } catch (error) {
      console.error('Failed to start Discord sign in:', error)
      showErrorToast(error instanceof Error ? error.message : 'Failed to start Discord sign in.')
    }
  }

  return (
    <PageCorpus
      category="Profile"
      title="Your Account"
      description="Account details and competitive standing for your Infinity Hexagonal Tic-Tac-Toe profile."
    >
      <div className="min-h-0 flex-1 px-4 pb-4 sm:px-6 sm:pb-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/6 px-6 py-10 text-center text-slate-300">
            Loading your account...
          </div>
        ) : errorMessage ? (
          <div className="rounded-[1.5rem] border border-rose-300/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : !account ? (
          <div className="flex h-full items-center justify-center">
            <section className="w-full max-w-2xl rounded-[1.75rem] border border-amber-300/20 bg-amber-300/10 p-6 text-center shadow-[0_20px_80px_rgba(15,23,42,0.35)] sm:p-8">
              <div className="text-xs uppercase tracking-[0.3em] text-amber-100/90">Profile Access</div>
              <h2 className="mt-4 text-3xl font-black uppercase tracking-[0.08em] text-white">Sign In Required</h2>
              <p className="mt-4 text-sm leading-6 text-amber-50/85 sm:text-base">
                Sign in with Discord to view your account details and competitive standing.
              </p>
              <button
                onClick={() => void handleSignIn()}
                className="mt-6 rounded-full bg-[#5865F2] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 hover:bg-[#6f7cff]"
              >
                Sign In With Discord
              </button>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_30%),rgba(255,255,255,0.06)] p-6 shadow-[0_24px_100px_rgba(15,23,42,0.4)] sm:p-8">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/50 to-transparent" />
              <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start gap-4">
                    {account.image ? (
                      <img
                        src={account.image}
                        alt={account.username}
                        className="h-20 w-20 flex-shrink-0 rounded-[1.5rem] object-cover ring-1 ring-white/10 sm:h-24 sm:w-24"
                      />
                    ) : (
                      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/10 text-3xl font-black text-white sm:h-24 sm:w-24">
                        {account.username.slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100">
                          {account.role === 'admin' ? 'Administrator' : 'Player Profile'}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-200">
                          Discord Account
                        </span>
                      </div>

                      <h2 className="mt-4 truncate text-3xl font-black uppercase tracking-[0.06em] text-white sm:text-4xl">
                        {account.username}
                      </h2>

                      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                        Your profile combines identity, match performance, and current ranking in one place, with competitive status leading the page.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  {isStatisticsLoading ? (
                    <StatisticsLoadingState />
                  ) : statisticsErrorMessage ? (
                    <StatisticsErrorState message={statisticsErrorMessage} />
                  ) : statistics ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <PrimaryStatCard
                        label="World Rank"
                        value={formatWorldRank(statistics.worldRank)}
                        detail={statistics.worldRank === null ? 'Finish a ranked game to enter the global standings.' : 'Current global placement based on ELO.'}
                        accentClassName="text-amber-200"
                      />
                      <PrimaryStatCard
                        label="ELO Rating"
                        value={statistics.elo}
                        detail="Current rating from ranked play."
                        accentClassName="text-sky-200"
                      />
                    </div>
                  ) : (
                    <StatisticsEmptyState />
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.35)]">
              <div className="text-xs uppercase tracking-[0.3em] text-sky-200/80">Match Performance</div>
              <h2 className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-white">Game Statistics</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                A focused breakdown of finished-game performance across all games and ranked play.
              </p>

              {isStatisticsLoading ? (
                <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-slate-950/45 px-4 py-8 text-center text-sm text-slate-300">
                  Loading your statistics...
                </div>
              ) : statisticsErrorMessage ? (
                <div className="mt-6 rounded-[1.25rem] border border-rose-300/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                  {statisticsErrorMessage}
                </div>
              ) : statistics ? (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <SecondaryStatCard
                    label="Total Games"
                    value={statistics.totalGames.played}
                    detail={formatWinSummary(statistics.totalGames.won, statistics.totalGames.played)}
                  />
                  <SecondaryStatCard
                    label="Ranked Games"
                    value={statistics.rankedGames.played}
                    detail={formatWinSummary(statistics.rankedGames.won, statistics.rankedGames.played)}
                  />
                  <SecondaryStatCard
                    label="Total Moves"
                    value={statistics.totalMovesMade}
                    detail="Moves recorded in your finished matches."
                  />
                </div>
              ) : (
                <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-slate-950/45 px-4 py-8 text-center text-sm text-slate-300">
                  Statistics will appear here once your profile data is ready.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </PageCorpus>
  )
}

export default ProfileScreen
