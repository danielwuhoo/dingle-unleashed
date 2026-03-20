import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { LeaderboardRow, LeaderboardTimeWindow } from './WordleService';

function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const WINDOW_LABELS: Record<LeaderboardTimeWindow, string> = {
    '1m': 'Last Month',
    '3m': 'Last 3 Months',
    ytd: 'Year to Date',
    all: 'All Time',
};

const BUTTON_CONFIG: { id: string; label: string; window: LeaderboardTimeWindow }[] = [
    { id: 'wordleLeaderboard1m', label: '1M', window: '1m' },
    { id: 'wordleLeaderboard3m', label: '3M', window: '3m' },
    { id: 'wordleLeaderboardYtd', label: 'YTD', window: 'ytd' },
    { id: 'wordleLeaderboardAll', label: 'All', window: 'all' },
];

export function buildLeaderboardReply(
    leaderboard: LeaderboardRow[],
    activeWindow: LeaderboardTimeWindow,
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
    const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
    const lines = leaderboard.map((entry, i) => {
        const rank = medals[i] || `**${i + 1}.**`;
        const percentile = ordinal(Math.round(entry.avg_percentile));
        return `${rank} **${entry.username}** \u2014 ${percentile} percentile (${entry.games} games)`;
    });

    const embed = new EmbedBuilder()
        .setTitle('\u{1F7E9} Wordle Leaderboard')
        .setDescription(lines.join('\n') || 'No results yet!')
        .setColor(0x538d4e)
        .setFooter({ text: WINDOW_LABELS[activeWindow] })
        .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        BUTTON_CONFIG.map((btn) =>
            new ButtonBuilder()
                .setCustomId(btn.id)
                .setLabel(btn.label)
                .setStyle(btn.window === activeWindow ? ButtonStyle.Primary : ButtonStyle.Secondary),
        ),
    );

    return { embeds: [embed], components: [row] };
}
