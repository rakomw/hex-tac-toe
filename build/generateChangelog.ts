import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ChangelogDay, ChangelogEntry, ChangelogEntryKind } from '../packages/shared/src/changelogTypes.js';

const SCRIPT_DIRECTORY_PATH = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT_PATH = resolve(SCRIPT_DIRECTORY_PATH, '..');
const SHARED_CHANGELOG_MODULE_PATH = resolve(REPOSITORY_ROOT_PATH, 'packages', 'shared', 'src', 'generatedChangelog.ts');

function readGitLog(): string {
    return execFileSync(
        'git',
        [
            '-c',
            `safe.directory=${REPOSITORY_ROOT_PATH}`,
            'log',
            '--date=short',
            '--pretty=format:%H%x1f%ct%x1f%ad%x1f%B%x1e'
        ],
        {
            cwd: REPOSITORY_ROOT_PATH,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'inherit']
        }
    );
}

function normalizeSummary(value: string): string {
    const normalizedValue = value.trim().replace(/\s+/g, ' ');
    if (!normalizedValue) {
        return 'Untitled change';
    }

    return normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1);
}

function resolveCommitKind(type: string | null): ChangelogEntryKind {
    switch (type?.toLowerCase()) {
        case 'feat':
            return 'feature';
        case 'fix':
            return 'fix';
        case 'misc':
        case 'chore':
        case 'docs':
        case 'refactor':
        case 'perf':
        case 'build':
        case 'ci':
        case 'test':
        case 'style':
            return 'maintenance';
        default:
            return 'other';
    }
}

function normalizeMessage(value: string): string {
    return value.replace(/\r\n/g, '\n').trim();
}

function isFooterStart(line: string): boolean {
    return /^(BREAKING CHANGE|BREAKING-CHANGE|[A-Za-z][A-Za-z0-9-]*)(?:: |\s+#).+/.test(line);
}

function parseFooterBlocks(lines: string[]): string[][] {
    const trimmedLines = [...lines];
    while (trimmedLines.length > 0 && trimmedLines.at(-1)?.trim() === '') {
        trimmedLines.pop();
    }

    const footerBlocks: string[][] = [];
    let cursor = trimmedLines.length - 1;

    while (cursor >= 0) {
        if (trimmedLines[cursor]?.trim() === '') {
            break;
        }

        let footerStartIndex = cursor;
        while (footerStartIndex >= 0 && !isFooterStart(trimmedLines[footerStartIndex] ?? '')) {
            footerStartIndex -= 1;
        }

        if (footerStartIndex < 0) {
            break;
        }

        footerBlocks.unshift(trimmedLines.slice(footerStartIndex, cursor + 1));
        cursor = footerStartIndex - 1;
    }

    return footerBlocks;
}

function parseBreakingChangeNote(message: string): string | null {
    const lines = message.split('\n');
    const footerBlocks = parseFooterBlocks(lines.slice(1));

    for (const block of footerBlocks) {
        const [headerLine, ...continuationLines] = block;
        const footerMatch = headerLine?.match(/^(BREAKING CHANGE|BREAKING-CHANGE):\s*(.+)$/);
        if (!footerMatch) {
            continue;
        }

        return normalizeSummary([footerMatch[2], ...continuationLines].join(' ').trim());
    }

    return null;
}

function parseCommitRecord(record: string): ChangelogEntry {
    const [hash, committedAtValue, date, rawMessage] = record.split('\x1f');
    const committedAt = Number.parseInt(committedAtValue ?? '', 10) * 1000;
    const message = normalizeMessage(rawMessage ?? '');
    const header = message.split('\n', 1)[0] ?? '';

    if (!hash || !date || !message || !Number.isFinite(committedAt)) {
        throw new Error(`Unable to parse git log record: ${record}`);
    }

    const conventionalCommitMatch = header.match(/^([A-Za-z][A-Za-z0-9-]*)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
    const type = conventionalCommitMatch?.[1]?.toLowerCase() ?? null;
    const summary = normalizeSummary(conventionalCommitMatch?.[4] ?? header);
    const breakingChangeNote = parseBreakingChangeNote(message);
    const isBreakingChange = Boolean(conventionalCommitMatch?.[3] || breakingChangeNote);

    return {
        hash,
        shortHash: hash.slice(0, 7),
        committedAt,
        date,
        type,
        scope: conventionalCommitMatch?.[2] ?? null,
        summary,
        kind: resolveCommitKind(type),
        isBreakingChange,
        breakingChangeNote: breakingChangeNote ?? (isBreakingChange ? summary : null)
    };
}

function groupCommitsByDate(entries: ChangelogEntry[]): ChangelogDay[] {
    const groupedEntries = new Map<string, ChangelogEntry[]>();

    for (const entry of entries) {
        const dateEntries = groupedEntries.get(entry.date);
        if (dateEntries) {
            dateEntries.push(entry);
            continue;
        }

        groupedEntries.set(entry.date, [entry]);
    }

    return [...groupedEntries.entries()].map(([date, dateEntries]) => ({
        date,
        commitCount: dateEntries.length,
        entries: dateEntries
    }));
}

function renderSharedModule(days: ChangelogDay[], generatedAt: string): string {
    return [
        "import type { ChangelogDay } from './changelogTypes';",
        '',
        `export const CHANGELOG_GENERATED_AT = ${JSON.stringify(generatedAt)};`,
        `export const CHANGELOG_COMMIT_COUNT = ${days.reduce((total, day) => total + day.commitCount, 0)};`,
        `export const CHANGELOG_DAYS: ChangelogDay[] = ${JSON.stringify(days, null, 4)};`,
        ''
    ].join('\n');
}

function main(): void {
    const generatedAt = new Date().toISOString();
    const changelogEntries = readGitLog()
        .split('\x1e')
        .map((record) => record.trim())
        .filter((record) => record.length > 0)
        .map(parseCommitRecord);
    const changelogDays = groupCommitsByDate(changelogEntries);

    mkdirSync(resolve(SHARED_CHANGELOG_MODULE_PATH, '..'), { recursive: true });
    writeFileSync(SHARED_CHANGELOG_MODULE_PATH, renderSharedModule(changelogDays, generatedAt), 'utf8');
}

main();
