import { Collection, GuildMember } from 'discord.js';

export interface WordleResult {
    userId: string;
    username: string;
    guesses: number;
}

export function getPuzzleNumberFromDate(date: Date): number {
    const wordle0 = new Date('2021-06-19T00:00:00Z');
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = target.getTime() - wordle0.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays - 1; // "yesterday's results"
}

function normalizeString(str: string): string {
    return str
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .toLowerCase()
        .trim();
}

function findMember(name: string, members: Collection<string, GuildMember>): GuildMember | null {
    const trimmedName = name.trim();

    // Check for Discord mention format <@userId>
    const mentionMatch = trimmedName.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        return members.get(mentionMatch[1]) || null;
    }

    const normalizedName = normalizeString(trimmedName);

    // Exact match on displayName (case-insensitive)
    let found = members.find(
        (m) => m.displayName.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (found) return found;

    // Exact match on username
    found = members.find(
        (m) => m.user.username.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (found) return found;

    // Normalized exact match on displayName
    found = members.find(
        (m) => normalizeString(m.displayName) === normalizedName,
    );
    if (found) return found;

    // startsWith / includes for truncated names
    if (normalizedName.length >= 3) {
        found = members.find(
            (m) => normalizeString(m.displayName).startsWith(normalizedName),
        );
        if (found) return found;

        found = members.find(
            (m) => normalizeString(m.displayName).includes(normalizedName),
        );
        if (found) return found;
    }

    return null;
}

export function parseWordleSummary(
    content: string,
    members: Collection<string, GuildMember>,
    messageDate?: Date,
): { results: WordleResult[]; puzzleNumber: number } {
    const puzzleNumber = getPuzzleNumberFromDate(messageDate || new Date());
    const results: WordleResult[] = [];

    const lines = content.split('\n');
    const scoreRegex = /(?:👑\s*)?([1-6X])\/6:\s*(.+)/;

    for (const line of lines) {
        const match = line.match(scoreRegex);
        if (!match) continue;

        const guessStr = match[1];
        const guesses = guessStr === 'X' ? 7 : parseInt(guessStr, 10);
        const namesSection = match[2];

        // Split on @ to get individual names, filtering empty strings
        const names = namesSection.split('@').filter((n) => n.trim().length > 0);

        for (const name of names) {
            const member = findMember(name, members);
            if (member) {
                results.push({
                    userId: member.id,
                    username: member.displayName,
                    guesses,
                });
            } else {
                console.warn(`[WordleParser] Could not resolve name: "${name.trim()}"`);
            }
        }
    }

    return { results, puzzleNumber };
}
