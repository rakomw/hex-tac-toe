import type { LobbyInfo } from '@ih3t/shared'

export const FINISHED_GAMES_PAGE_SIZE = 20
export type FinishedGamesArchiveView = 'all' | 'mine'

export const queryKeys = {
  account: ['account'] as const,
  accountPreferences: ['account', 'preferences'] as const,
  accountStatistics: ['account', 'statistics'] as const,
  adminServerSettings: ['admin', 'server-settings'] as const,
  adminStats: (timezoneOffsetMinutes: number) => ['admin', 'stats', timezoneOffsetMinutes] as const,
  leaderboard: ['leaderboard'] as const,
  availableSessions: ['sessions', 'available'] as const,
  finishedGames: ['finished-games'] as const,
  finishedGamesPage: (view: FinishedGamesArchiveView, page: number, pageSize: number, baseTimestamp: number) =>
    ['finished-games', view, page, pageSize, baseTimestamp] as const,
  finishedGame: (gameId: string) => ['finished-games', gameId] as const
}

export function sortLobbySessions(sessions: LobbyInfo[]) {
  return [...sessions].sort((leftSession, rightSession) => {
    const leftCanJoin = leftSession.startedAt === null && leftSession.playerNames.length < 2
    const rightCanJoin = rightSession.startedAt === null && rightSession.playerNames.length < 2

    if (leftCanJoin !== rightCanJoin) {
      return leftCanJoin ? -1 : 1
    }

    return (rightSession.startedAt ?? 0) - (leftSession.startedAt ?? 0)
  })
}
