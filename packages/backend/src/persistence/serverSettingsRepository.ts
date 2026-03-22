import type { Logger } from 'pino';
import { inject, injectable } from 'tsyringe';
import {
    DEFAULT_SERVER_SETTINGS,
    type ServerSettings,
    zServerSettings,
} from '@ih3t/shared';
import { z } from 'zod';
import type { AccountUserProfile } from '../auth/authRepository';
import { ROOT_LOGGER } from '../logger';
import { MongoDatabase } from './mongoClient';

const COLLECTION_NAME = 'serverSettings';
const SERVER_SETTING_KEYS = Object.keys(DEFAULT_SERVER_SETTINGS) as Array<keyof ServerSettings>;

const zServerSettingDocument = z.object({
    key: z.string().min(1),
    value: z.unknown(),
    lastUpdatedAt: z.number().int().nonnegative(),
    lastUpdatedBy: z.string().min(1),
});
type ServerSettingDocument = z.infer<typeof zServerSettingDocument>;

@injectable()
export class ServerSettingsRepository {
    private readonly logger: Logger;

    constructor(
        @inject(ROOT_LOGGER) rootLogger: Logger,
        @inject(MongoDatabase) private readonly mongoDatabase: MongoDatabase
    ) {
        this.logger = rootLogger.child({ component: 'server-settings-repository' });
    }

    async getSettings(): Promise<ServerSettings> {
        const collection = await this.getCollection();
        const documents = await collection.find({ key: { $in: SERVER_SETTING_KEYS } }).toArray();
        const settings: ServerSettings = { ...DEFAULT_SERVER_SETTINGS };

        for (const rawDocument of documents) {
            const document = zServerSettingDocument.parse(rawDocument);
            const key = this.parseServerSettingKey(document.key);
            if (!key) {
                continue;
            }

            settings[key] = this.parseServerSettingValue(key, document.value);
        }

        return settings;
    }

    async updateSettings(settings: ServerSettings, updatedBy: AccountUserProfile): Promise<ServerSettings> {
        const normalizedSettings = zServerSettings.parse(settings);
        const lastUpdatedAt = Date.now();
        const lastUpdatedBy = this.toStoredUser(updatedBy);
        const collection = await this.getCollection();

        await collection.bulkWrite(
            SERVER_SETTING_KEYS.map((key) => ({
                updateOne: {
                    filter: { key },
                    update: {
                        $set: {
                            key,
                            value: normalizedSettings[key],
                            lastUpdatedAt,
                            lastUpdatedBy
                        }
                    },
                    upsert: true
                }
            })),
            { ordered: false }
        );

        this.logger.info({
            event: 'server-settings.updated',
            maxConcurrentGames: normalizedSettings.maxConcurrentGames,
            lastUpdatedAt,
            lastUpdatedBy
        }, 'Updated server settings');

        return { ...normalizedSettings };
    }

    private async getCollection() {
        const database = await this.mongoDatabase.getDatabase();
        const collection = database.collection<ServerSettingDocument>(COLLECTION_NAME);
        await collection.createIndex({ key: 1 }, { unique: true });
        return collection;
    }

    private parseServerSettingKey(value: string): keyof ServerSettings | null {
        return SERVER_SETTING_KEYS.includes(value as keyof ServerSettings)
            ? value as keyof ServerSettings
            : null;
    }

    private parseServerSettingValue(key: keyof ServerSettings, value: unknown): ServerSettings[keyof ServerSettings] {
        switch (key) {
            case 'maxConcurrentGames':
                return zServerSettings.shape.maxConcurrentGames.parse(value);
        }
    }

    private toStoredUser(user: AccountUserProfile): ServerSettingDocument['lastUpdatedBy'] {
        return user.id;
    }
}
