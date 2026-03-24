export const FINISHED_GAMES_PAGE_SIZE = 20;
export type FinishedGamesArchiveView = 'all' | 'mine';

export const queryKeys = {
    account: ['account'] as const,
    publicAccount: (profileId: string | null) => ['account', 'public', profileId ?? "unknown"] as const,
    accountPreferences: ['account', 'preferences'] as const,
    accountStatistics: ['account', 'statistics'] as const,
    publicAccountStatistics: (profileId: string | null) => ['account', 'public', profileId ?? "unknown", 'statistics'] as const,
    adminServerSettings: ['admin', 'server-settings'] as const,
    adminStats: (timezoneOffsetMinutes: number) => ['admin', 'stats', timezoneOffsetMinutes] as const,
    leaderboard: ['leaderboard'] as const,
    availableSessions: ['sessions', 'available'] as const,
    sandboxPosition: (positionId: string | null) => ['sandbox-position', positionId ?? "none"] as const,
    finishedGames: ['finished-games'] as const,
    finishedGamesPage: (view: FinishedGamesArchiveView, page: number, pageSize: number, baseTimestamp: number) =>
        ['finished-games', view, page, pageSize, baseTimestamp] as const,
    finishedGame: (gameId: string | null) => ['finished-games', gameId ?? "empty"] as const,
    serverShutdown: ['server-shutdown'] as const
};
