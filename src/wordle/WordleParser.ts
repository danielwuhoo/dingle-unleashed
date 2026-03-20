import { Collection, GuildMember } from 'discord.js';

export interface WordleResult {
    userId: string;
    username: string;
    guesses: number;
}

export function getPuzzleNumberFromDate(date: Date): number {
    const wordleEpoch = new Date('2021-06-19T00:00:00Z');
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = target.getTime() - wordleEpoch.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

const NAME_ALIASES: Record<string, string> = {
    '𝖚𝖗 𝖓𝖔𝖙 𝖒𝖞': '141709556223967232',
    '𝓻𝓪𝓶𝓫𝓸': '141709556223967232',
    '𝕏𝕩\_🅨🅐🅜🅩\_𝕩𝕏': '187000164525932545',
};

function normalizeString(str: string): string {
    return str
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, '')
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

    // Check alias map first
    for (const [alias, userId] of Object.entries(NAME_ALIASES)) {
        if (normalizeString(trimmedName) === normalizeString(alias) || trimmedName.toLowerCase() === alias.toLowerCase()) {
            return members.get(userId) || null;
        }
    }

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

    // startsWith for truncated names
    if (normalizedName.length >= 3) {
        found = members.find(
            (m) => normalizeString(m.displayName).startsWith(normalizedName),
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
    const puzzleNumber = getPuzzleNumberFromDate(messageDate || new Date()) - 1;
    const results: WordleResult[] = [];

    const lines = content.split('\n');
    const scoreRegex = /(?:👑\s*)?([1-6X])\/6:\s*(.+)/;

    const mentionRegex = /<@!?(\d+)>/g;
    const nameRegex = /@(.+?)(?=\s*@|$)/g;

    for (const line of lines) {
        const match = line.match(scoreRegex);
        if (!match) continue;

        const guessStr = match[1];
        const guesses = guessStr === 'X' ? 7 : parseInt(guessStr, 10);
        let namesSection = match[2];

        // Step 1: Extract Discord mentions before splitting
        let mentionMatch;
        while ((mentionMatch = mentionRegex.exec(namesSection)) !== null) {
            const userId = mentionMatch[1];
            const member = members.get(userId);
            if (member) {
                results.push({
                    userId: member.id,
                    username: member.displayName,
                    guesses,
                });
            } else {
                console.warn(`[WordleParser] Could not resolve mention: <@${userId}>`);
            }
        }
        mentionRegex.lastIndex = 0;

        // Remove mentions so they don't interfere with plaintext name extraction
        namesSection = namesSection.replace(mentionRegex, '');

        // Step 2: Extract plaintext @names via regex
        let nameMatch;
        while ((nameMatch = nameRegex.exec(namesSection)) !== null) {
            const name = nameMatch[1].trim();
            if (!name) continue;
            const member = findMember(name, members);
            if (member) {
                results.push({
                    userId: member.id,
                    username: member.displayName,
                    guesses,
                });
            } else {
                console.warn(`[WordleParser] Could not resolve name: "${name}" (from line: "${line.trim()}")`);
            }
        }
        nameRegex.lastIndex = 0;
    }

    return { results, puzzleNumber };
}
