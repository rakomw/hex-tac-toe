import { useParams } from 'react-router'
import ProfileScreen from '../components/ProfileScreen'
import {
  useQueryAccount,
  useQueryProfile,
  useQueryProfileStatistics
} from '../query/accountClient'
import { useQueryPublicProfileGames as useQueryProfileGames } from '../query/finishedGamesClient'
import { useQueryAvailableSessions } from '../query/sessionClient'

function ProfileRoute() {
  const { profileId } = useParams<{ profileId: string }>()
  const isPublicProfileRoute = Boolean(profileId)

  const accountQuery = useQueryAccount({ enabled: true })
  const targetProfileId = profileId ?? accountQuery.data?.user?.id ?? null;

  const profileQuery = useQueryProfile(targetProfileId)
  const profileStatisticsQuery = useQueryProfileStatistics(targetProfileId)
  const recentGamesQuery = useQueryProfileGames(targetProfileId)

  const availableSessionsQuery = useQueryAvailableSessions()

  const liveGame = availableSessionsQuery.data?.find((session) =>
    session.startedAt !== null && session.players.some((player) => player.profileId === targetProfileId)
  ) ?? null

  const error = profileQuery.error
  const statisticsError = profileStatisticsQuery.error

  return (
    <ProfileScreen
      account={profileQuery.data?.user ?? null}
      statistics={profileStatisticsQuery.data?.statistics ?? null}
      recentGames={recentGamesQuery.data ?? null}
      liveGame={liveGame}
      isLoading={profileQuery.isLoading}
      isStatisticsLoading={profileStatisticsQuery.isLoading}
      isRecentGamesLoading={recentGamesQuery.isLoading || recentGamesQuery.isRefetching}
      errorMessage={error instanceof Error ? error.message : null}
      statisticsErrorMessage={statisticsError instanceof Error ? statisticsError.message : null}
      recentGamesErrorMessage={recentGamesQuery.error instanceof Error ? recentGamesQuery.error.message : null}
      isPublicView={isPublicProfileRoute}
    />
  )
}

export default ProfileRoute
