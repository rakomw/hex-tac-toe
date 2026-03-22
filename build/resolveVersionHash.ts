import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

export const DEFAULT_APP_VERSION_HASH = 'unknown';

function normalizeVersionHash(value: string | null | undefined): string | null {
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
        return null;
    }

    return trimmedValue.slice(0, 7);
}

export function resolveVersionHash(): string {
    const envVersionHash = normalizeVersionHash(
        process.env.APP_VERSION_HASH
        ?? process.env.GIT_COMMIT_HASH
        ?? process.env.VERCEL_GIT_COMMIT_SHA
        ?? process.env.GITHUB_SHA
        ?? process.env.SOURCE_VERSION
    );
    if (envVersionHash) {
        return envVersionHash;
    }

    try {
        const repositoryRootPath = resolve(import.meta.dirname, '..');
        const gitVersionHash = execSync(`git -c safe.directory=${repositoryRootPath} rev-parse HEAD`, {
            cwd: repositoryRootPath,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        });

        return normalizeVersionHash(gitVersionHash) ?? DEFAULT_APP_VERSION_HASH;
    } catch {
        return DEFAULT_APP_VERSION_HASH;
    }
}
