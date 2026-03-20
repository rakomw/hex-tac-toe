import type { AccountResponse, AdminLeaderboard, AdminStatsResponse, FinishedGameRecord, FinishedGamesPage, LobbyInfo } from '@ih3t/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchJson } from './apiClient'

export const FINISHED_GAMES_PAGE_SIZE = 20
export type FinishedGamesArchiveView = 'all' | 'mine'

export const queryKeys = {
  account: ['account'] as const,
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

async function fetchAvailableSessions() {
  const sessions = await fetchJson<LobbyInfo[]>('/api/sessions')
  return sortLobbySessions(sessions)
}

async function fetchAccount() {
  return await fetchJson<AccountResponse>('/api/account')
}

async function fetchAdminStats(timezoneOffsetMinutes: number) {
  return await fetchJson<AdminStatsResponse>(`/api/admin/stats?tzOffsetMinutes=${timezoneOffsetMinutes}`)
}

async function fetchLeaderboard() {
  return await fetchJson<AdminLeaderboard>('/api/leaderboard')
}

async function fetchFinishedGames(
  page: number,
  pageSize: number,
  baseTimestamp: number,
  view: FinishedGamesArchiveView
) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    baseTimestamp: String(baseTimestamp)
  })
  if (view === 'mine') {
    params.set('view', view)
  }

  return await fetchJson<FinishedGamesPage>(`/api/finished-games?${params.toString()}`)
}

async function fetchFinishedGame(gameId: string) {
  return await fetchJson<FinishedGameRecord>(`/api/finished-games/${encodeURIComponent(gameId)}`)
}

export function useQueryAvailableSessions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.availableSessions,
    queryFn: fetchAvailableSessions,
    enabled: options?.enabled
  })
}

export function useQueryAccount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.account,
    queryFn: fetchAccount,
    enabled: options?.enabled
  })
}

export function useQueryAdminStats(timezoneOffsetMinutes: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.adminStats(timezoneOffsetMinutes),
    queryFn: () => fetchAdminStats(timezoneOffsetMinutes),
    enabled: options?.enabled,
    refetchInterval: (query) => {
      const nextRefreshAt = query.state.data?.leaderboard.nextRefreshAt
      if (!nextRefreshAt) {
        return 10 * 60 * 1000
      }

      return Math.max(1_000, nextRefreshAt - Date.now())
    },
    refetchIntervalInBackground: true
  })
}

export function useQueryLeaderboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.leaderboard,
    queryFn: fetchLeaderboard,
    enabled: options?.enabled,
    refetchInterval: (query) => {
      const nextRefreshAt = query.state.data?.nextRefreshAt
      if (!nextRefreshAt) {
        return 10 * 60 * 1000
      }

      return Math.max(1_000, nextRefreshAt - Date.now())
    },
    refetchIntervalInBackground: true
  })
}

export function useQueryFinishedGames(
  page: number,
  baseTimestamp: number,
  view: FinishedGamesArchiveView,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.finishedGamesPage(view, page, FINISHED_GAMES_PAGE_SIZE, baseTimestamp),
    queryFn: () => fetchFinishedGames(page, FINISHED_GAMES_PAGE_SIZE, baseTimestamp, view),
    placeholderData: keepPreviousData,
    enabled: options?.enabled
  })
}

export function useQueryFinishedGame(gameId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: gameId ? queryKeys.finishedGame(gameId) : ['finished-games', 'unknown'],
    queryFn: () => {
      if (!gameId) {
        throw new Error('Missing finished game id.')
      }

      return fetchFinishedGame(gameId)
    },
    enabled: Boolean(gameId) && options?.enabled
  })
}
