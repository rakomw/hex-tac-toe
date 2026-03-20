import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import { inject, injectable } from 'tsyringe';
import type { Collection, Document } from 'mongodb';
import {
    type AdminLongestGameInDuration,
    type AdminLongestGameInMoves,
    type DatabaseGame,
    type DatabaseGamePlayer,
    type DatabaseGameResult,
    DEFAULT_LOBBY_OPTIONS,
    type FinishedGameRecord,
    type FinishedGameSummary,
    type FinishedGamesPage,
    type GameMove,
    type LobbyOptions,
    zDatabaseGame,
    zFinishedGameRecord,
    zFinishedGamesPage,
    zFinishedGameSummary,
    zGameMove,
    zLobbyOptions,
    zSessionFinishReason,
} from '@ih3t/shared';
import { z } from 'zod';
import { ROOT_LOGGER } from '../logger';
import { MongoDatabase } from './mongoClient';

const zGameHistoryDocument = zDatabaseGame;
type GameHistoryDocument = z.infer<typeof zGameHistoryDocument> & Document;

const zLegacyGameHistoryDocument = z.object({
    _id: z.unknown().optional(),
    id: z.string(),
    sessionId: z.string(),
    state: z.enum(['lobby', 'in-game', 'finished']).optional(),
    players: z.array(z.string()).optional(),
    playerNames: z.record(z.string(), z.string()).optional(),
    playerProfileIds: z.record(z.string(), z.string().nullable()).optional(),
    winningPlayerId: z.string().nullable().optional(),
    reason: zSessionFinishReason.nullable().optional(),
    moveCount: z.number().int().nonnegative().optional(),
    moves: z.array(zGameMove).optional(),
    createdAt: z.number().int().optional(),
    startedAt: z.number().int().nullable().optional(),
    finishedAt: z.number().int().nullable().optional(),
    gameDurationMs: z.number().int().nonnegative().nullable().optional(),
    updatedAt: z.number().int().optional(),
    gameOptions: zLobbyOptions.optional(),
});
type LegacyGameHistoryDocument = z.infer<typeof zLegacyGameHistoryDocument> & Document;

interface ListFinishedGamesOptions {
    page?: number;
    pageSize?: number;
    baseTimestamp?: number;
    playerProfileId?: string;
}

export interface GameHistoryAdminWindowStats {
    gamesPlayed: number;
    longestGameInMoves: AdminLongestGameInMoves | null;
    longestGameInDuration: AdminLongestGameInDuration | null;
}

const mongoDbName = process.env.MONGODB_DB_NAME ?? 'ih3t';
const mongoCollectionName = process.env.MONGODB_GAME_HISTORY_COLLECTION ?? 'gameHistory';

@injectable()
export class GameHistoryRepository {
    private collectionPromise: Promise<Collection<GameHistoryDocument>> | null = null;
    private readonly logger: Logger;

    constructor(
        @inject(ROOT_LOGGER) rootLogger: Logger,
        @inject(MongoDatabase) private readonly mongoDatabase: MongoDatabase
    ) {
        this.logger = rootLogger.child({ component: 'game-history-repository' });
    }

    async createGame(sessionId: string, players: DatabaseGamePlayer[], gameOptions: LobbyOptions): Promise<string> {
        const collection = await this.getCollection();
        const gameId = randomUUID();
        const startedAt = Date.now();

        try {
            await collection.insertOne({
                id: gameId,
                version: 2,

                sessionId,
                startedAt,
                finishedAt: null,
                players,
                gameOptions,
                moves: [],
                moveCount: 0,
                gameResult: null
            });
        } catch (error: unknown) {
            this.logger.error({
                err: error,
                type: 'game-history',
                event: 'game-history-create-error',
                storage: 'mongodb',
                gameId,
                sessionId
            }, 'Failed to create game history');
        }

        return gameId;
    }

    async appendMove(gameId: string, move: GameMove): Promise<void> {
        const collection = await this.getCollection();

        try {
            const result = await collection.updateOne(
                { id: gameId },
                {
                    $push: {
                        moves: move
                    } as never,
                    $inc: {
                        moveCount: 1
                    }
                }
            );

            if (result.matchedCount === 0) {
                this.logMissingHistory('game-history-move-error', gameId, {
                    moveNumber: move.moveNumber
                });
            }
        } catch (error: unknown) {
            this.logger.error({
                err: error,
                type: 'game-history',
                event: 'game-history-move-error',
                storage: 'mongodb',
                gameId,
                moveNumber: move.moveNumber
            }, 'Failed to append game move');
        }
    }

    async finishGame(gameId: string, result: DatabaseGameResult): Promise<void> {
        const collection = await this.getCollection();
        const finishedAt = Date.now();

        try {
            const updateResult = await collection.updateOne(
                { id: gameId },
                {
                    $set: {
                        finishedAt,
                        gameResult: {
                            winningPlayerId: result.winningPlayerId,
                            durationMs: result.durationMs,
                            reason: result.reason
                        }
                    }
                }
            );

            if (updateResult.matchedCount === 0) {
                this.logMissingHistory('game-history-finalize-error', gameId);
            }
        } catch (error: unknown) {
            this.logger.error({
                err: error,
                type: 'game-history',
                event: 'game-history-finalize-error',
                storage: 'mongodb',
                gameId
            }, 'Failed to finalize game history');
        }
    }

    async listFinishedGames(options: ListFinishedGamesOptions = {}): Promise<FinishedGamesPage> {
        const collection = await this.getCollection();
        const pageSize = this.normalizePageSize(options.pageSize);
        const baseTimestamp = this.normalizeBaseTimestamp(options.baseTimestamp);
        const requestedPage = this.normalizePage(options.page);
        const matchStage = this.buildFinishedGamesMatch(baseTimestamp, options.playerProfileId);
        const aggregationResult = await collection.aggregate<{
            games: GameHistoryDocument[];
            totals: Array<{ totalGames: number; totalMoves: number }>;
        }>([
            {
                $match: matchStage
            },
            { $sort: { finishedAt: -1, id: -1 } },
            {
                $facet: {
                    games: [
                        { $skip: (requestedPage - 1) * pageSize },
                        { $limit: pageSize }
                    ],
                    totals: [
                        {
                            $group: {
                                _id: null,
                                totalGames: { $sum: 1 },
                                totalMoves: { $sum: '$moveCount' }
                            }
                        }
                    ]
                }
            }
        ]).toArray();
        const facetResult = aggregationResult[0] ?? { games: [], totals: [] };
        const totalGames = facetResult.totals[0]?.totalGames ?? 0;
        const totalMoves = facetResult.totals[0]?.totalMoves ?? 0;
        const totalPages = Math.max(1, Math.ceil(totalGames / pageSize));
        const page = Math.min(requestedPage, totalPages);
        const games = page === requestedPage
            ? facetResult.games
            : await collection
                .find(matchStage)
                .sort({ finishedAt: -1, id: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .toArray();

        return zFinishedGamesPage.parse({
            games: games.map((document) => this.mapSummary(document)),
            pagination: {
                page,
                pageSize,
                totalGames,
                totalMoves,
                totalPages,
                baseTimestamp
            }
        });
    }

    async getFinishedGame(id: string): Promise<FinishedGameRecord | undefined> {
        const collection = await this.getCollection();
        const document = await collection.findOne({
            id,
            finishedAt: {
                $ne: null
            }
        });

        if (!document) {
            return undefined;
        }

        return this.mapRecord(document);
    }

    async getAdminWindowStats(startAt: number, endAt: number): Promise<GameHistoryAdminWindowStats> {
        const collection = await this.getCollection();
        const finishedGameMatch = {
            finishedAt: {
                $ne: null,
                $gte: startAt,
                $lte: endAt
            }
        };

        const [gamesPlayed, longestGameInMovesDocument, longestGameInDurationDocument] = await Promise.all([
            collection.countDocuments(finishedGameMatch),
            collection.find(finishedGameMatch).sort({ moveCount: -1, finishedAt: -1, id: 1 }).limit(1).next(),
            collection.find({
                ...finishedGameMatch,
                'gameResult.durationMs': {
                    $ne: null,
                    $lt: 8 * 60 * 60 * 1000
                }
            }).sort({ 'gameResult.durationMs': -1, finishedAt: -1, id: 1 }).limit(1).next()
        ]);

        return {
            gamesPlayed,
            longestGameInMoves: longestGameInMovesDocument
                ? this.mapAdminLongestGameInMoves(longestGameInMovesDocument)
                : null,
            longestGameInDuration: longestGameInDurationDocument
                ? this.mapAdminLongestGameInDuration(longestGameInDurationDocument)
                : null
        };
    }

    private async getCollection(): Promise<Collection<GameHistoryDocument>> {
        if (this.collectionPromise !== null) {
            return this.collectionPromise;
        }

        this.collectionPromise = (async () => {
            const database = await this.mongoDatabase.getDatabase();
            const collection = database.collection<GameHistoryDocument>(mongoCollectionName);
            await collection.createIndex({ id: 1 }, { unique: true });
            await collection.createIndex({ finishedAt: -1, id: -1 });
            await collection.createIndex({ sessionId: 1, finishedAt: -1 });
            await collection.createIndex({ 'players.profileId': 1, finishedAt: -1, id: -1 });
            await this.migrateExistingGames(collection);

            this.logger.info({
                type: 'game-history',
                event: 'game-history-storage-ready',
                storage: 'mongodb',
                database: mongoDbName,
                collection: mongoCollectionName
            }, 'Game history storage ready');

            return collection;
        })().catch((error: unknown) => {
            this.collectionPromise = null;

            this.logger.error({
                err: error,
                type: 'game-history',
                event: 'game-history-storage-error',
                storage: 'mongodb',
            }, 'Failed to initialize game history storage');

            throw error;
        });

        return this.collectionPromise;
    }

    private mapSummary(document: unknown): FinishedGameSummary {
        const parsedDocument = zGameHistoryDocument.parse(document);

        return zFinishedGameSummary.parse({
            id: parsedDocument.id,
            sessionId: parsedDocument.sessionId,
            startedAt: parsedDocument.startedAt,
            finishedAt: parsedDocument.finishedAt,
            players: parsedDocument.players.map((player) => ({ ...player })),
            gameOptions: this.cloneGameOptions(parsedDocument.gameOptions),
            moveCount: parsedDocument.moveCount,
            gameResult: parsedDocument.gameResult
                ? { ...parsedDocument.gameResult }
                : null
        });
    }

    private mapRecord(document: unknown): FinishedGameRecord {
        const parsedDocument = zGameHistoryDocument.parse(document);

        return zFinishedGameRecord.parse({
            ...this.mapSummary(parsedDocument),
            moves: parsedDocument.moves.map((move) => ({ ...move }))
        });
    }

    private mapAdminLongestGameInMoves(document: unknown): AdminLongestGameInMoves {
        const parsedDocument = zGameHistoryDocument.parse(document);

        return {
            gameId: parsedDocument.id,
            sessionId: parsedDocument.sessionId,
            players: parsedDocument.players.map((player) => player.displayName),
            finishedAt: parsedDocument.finishedAt ?? parsedDocument.startedAt,
            moveCount: parsedDocument.moveCount
        };
    }

    private mapAdminLongestGameInDuration(document: unknown): AdminLongestGameInDuration {
        const parsedDocument = zGameHistoryDocument.parse(document);
        const durationMs = parsedDocument.gameResult?.durationMs;
        if (durationMs === null || durationMs === undefined) {
            throw new Error(`Game ${parsedDocument.id} is missing a duration.`);
        }

        return {
            gameId: parsedDocument.id,
            sessionId: parsedDocument.sessionId,
            players: parsedDocument.players.map((player) => player.displayName),
            finishedAt: parsedDocument.finishedAt ?? parsedDocument.startedAt,
            durationMs
        };
    }

    private async migrateExistingGames(collection: Collection<GameHistoryDocument>): Promise<void> {
        const legacyDocuments = await collection.find({
            $or: [
                { version: { $exists: false } },
            ]
        }).toArray();

        if (legacyDocuments.length === 0) {
            return;
        }

        const operations = legacyDocuments.flatMap((document) => {
            const migratedDocument = this.migrateLegacyDocument(document);
            if (!migratedDocument) {
                return [];
            }

            return [{
                replaceOne: {
                    filter: { _id: document._id },
                    replacement: {
                        _id: document._id,
                        ...migratedDocument
                    } as GameHistoryDocument
                }
            }];
        });

        if (operations.length === 0) {
            return;
        }

        await collection.bulkWrite(operations, { ordered: false });
        this.logger.info({
            type: 'game-history',
            event: 'game-history-migration-complete',
            storage: 'mongodb',
            migratedGames: operations.length
        }, 'Migrated legacy game history documents');
    }

    private migrateLegacyDocument(document: unknown): DatabaseGame | null {
        const alreadyMigratedDocument = zGameHistoryDocument.safeParse(document);
        if (alreadyMigratedDocument.success) {
            return alreadyMigratedDocument.data;
        }

        const legacyDocument = zLegacyGameHistoryDocument.safeParse(document);
        if (!legacyDocument.success) {
            this.logger.warn({
                type: 'game-history',
                event: 'game-history-migration-skipped',
                storage: 'mongodb',
                issues: legacyDocument.error.issues
            }, 'Skipped migrating an invalid game history document');
            return null;
        }

        const parsedDocument = legacyDocument.data;
        const moves = parsedDocument.moves ?? [];
        const startedAt = parsedDocument.startedAt
            ?? parsedDocument.createdAt
            ?? moves[0]?.timestamp
            ?? parsedDocument.updatedAt
            ?? Date.now();
        const finishedAt = parsedDocument.finishedAt ?? null;
        const players = this.mapLegacyPlayers(parsedDocument.players ?? [], parsedDocument);
        const moveCount = Math.max(parsedDocument.moveCount ?? 0, moves.length);
        const durationMs = parsedDocument.gameDurationMs
            ?? (finishedAt === null ? null : Math.max(0, finishedAt - startedAt));
        const gameResult = finishedAt === null
            ? null
            : {
                winningPlayerId: parsedDocument.winningPlayerId ?? null,
                durationMs,
                reason: parsedDocument.reason ?? 'terminated'
            } satisfies DatabaseGameResult;

        return zGameHistoryDocument.parse({
            id: parsedDocument.id,
            version: 2,

            sessionId: parsedDocument.sessionId,
            startedAt,
            finishedAt,
            players,
            gameOptions: parsedDocument.gameOptions
                ? this.cloneGameOptions(parsedDocument.gameOptions)
                : this.createDefaultGameOptions(),
            moves: moves.map((move) => ({ ...move })),
            moveCount,
            gameResult
        });
    }

    private mapLegacyPlayers(playerIds: string[], document: LegacyGameHistoryDocument): DatabaseGamePlayer[] {
        return playerIds.map((playerId, playerIndex) => ({
            playerId,
            displayName: document.playerNames?.[playerId]?.trim() || `Player ${playerIndex + 1}`,
            profileId: document.playerProfileIds?.[playerId] ?? playerId
        }));
    }

    private cloneGameOptions(gameOptions: LobbyOptions): LobbyOptions {
        return {
            ...gameOptions,
            timeControl: { ...gameOptions.timeControl }
        };
    }

    private createDefaultGameOptions(): LobbyOptions {
        return this.cloneGameOptions(DEFAULT_LOBBY_OPTIONS);
    }

    private buildFinishedGamesMatch(baseTimestamp: number, playerProfileId?: string) {
        return {
            finishedAt: {
                $ne: null,
                $lte: baseTimestamp
            },
            ...(playerProfileId ? { 'players.profileId': playerProfileId } : {})
        };
    }

    private normalizePageSize(pageSize: number | undefined): number {
        if (!pageSize || !Number.isFinite(pageSize)) {
            return 20;
        }

        return Math.min(100, Math.max(1, Math.floor(pageSize)));
    }

    private normalizePage(page: number | undefined): number {
        if (!page || !Number.isFinite(page)) {
            return 1;
        }

        return Math.max(1, Math.floor(page));
    }

    private normalizeBaseTimestamp(baseTimestamp: number | undefined): number {
        if (!baseTimestamp || !Number.isFinite(baseTimestamp)) {
            return Date.now();
        }

        return Math.max(0, Math.floor(baseTimestamp));
    }

    private logMissingHistory(event: string, gameId: string, extraDetails: Record<string, unknown> = {}): void {
        this.logger.warn({
            type: 'game-history',
            event,
            storage: 'mongodb',
            gameId,
            ...extraDetails
        }, 'Game history does not exist');
    }
}
