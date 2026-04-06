import { getLetterStates } from "./wordle-utils";

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const API_BASE = "https://discord.com/api/v10";

const EMOJI_CORRECT = "🟩";
const EMOJI_PRESENT = "🟨";
const EMOJI_ABSENT = "⬛";
const EMOJI_EMPTY = "⬜";

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const emojiMap: Record<string, string> = {
  correct: EMOJI_CORRECT,
  present: EMOJI_PRESENT,
  absent: EMOJI_ABSENT,
};

export interface BoardUser {
  username: string;
  userId: string;
  avatar?: string | null;
}

function getAvatarUrl(
  userId: string,
  avatar?: string | null,
): string | undefined {
  if (!avatar) return undefined;
  const ext = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=128`;
}

function buildBoardGrid(guesses: string[], solution: string): string {
  const rows: string[] = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    if (i < guesses.length) {
      const states = getLetterStates(guesses[i], solution);
      rows.push(states.map((s) => emojiMap[s]).join(""));
    } else {
      rows.push(Array(WORD_LENGTH).fill(EMOJI_EMPTY).join(""));
    }
  }
  return rows.join("\n");
}

export function buildBoardEmbed(
  user: BoardUser,
  puzzleNumber: number,
  guesses: string[],
  solution: string,
  gameStatus: "playing" | "won" | "lost",
): Record<string, unknown> {
  let title = `${user.username}'s Wordle #${puzzleNumber}`;
  if (gameStatus === "won") {
    title += ` — ${guesses.length}/${MAX_GUESSES}`;
  } else if (gameStatus === "lost") {
    title += ` — X/${MAX_GUESSES}`;
  }

  const color =
    gameStatus === "won"
      ? 0xa6da95
      : gameStatus === "lost"
      ? 0xed8796
      : 0xeed49f;
  const avatarUrl = getAvatarUrl(user.userId, user.avatar);

  return {
    title,
    description: buildBoardGrid(guesses, solution),
    color,
    ...(avatarUrl && { thumbnail: { url: avatarUrl } }),
  };
}

function buildActivityButton() {
    if (!CLIENT_ID) return [];
    return [
        {
            type: 1, // Action Row
            components: [
                {
                    type: 2, // Button
                    style: 5, // Link
                    label: 'play with my dingle',
                    emoji: { name: '🍆' },
                    url: `https://discord.com/activities/${CLIENT_ID}`,
                },
            ],
        },
    ];
}

export async function postMessage(
  channelId: string,
  embed: Record<string, unknown>,
): Promise<string | null> {
  if (!BOT_TOKEN) {
    console.warn("[Discord] BOT_TOKEN not set, skipping message post");
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [embed], components: buildActivityButton() }),
    });

    if (!res.ok) {
      console.error(
        "[Discord] Failed to post message:",
        res.status,
        await res.text(),
      );
      return null;
    }

    const data = await res.json();
    return data.id;
  } catch (e) {
    console.error("[Discord] Error posting message:", e);
    return null;
  }
}

export async function editMessage(
  channelId: string,
  messageId: string,
  embed: Record<string, unknown>,
): Promise<void> {
  if (!BOT_TOKEN) return;

  try {
    const res = await fetch(
      `${API_BASE}/channels/${channelId}/messages/${messageId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ embeds: [embed], components: buildActivityButton() }),
      },
    );

    if (!res.ok) {
      console.error(
        "[Discord] Failed to edit message:",
        res.status,
        await res.text(),
      );
    }
  } catch (e) {
    console.error("[Discord] Error editing message:", e);
  }
}

// Summary

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"];

export interface SummaryResult {
  userId: string;
  guessCount: number;
  won: boolean;
}

export function buildSummaryEmbed(
  puzzleNumber: number,
  results: SummaryResult[],
): Record<string, unknown> {
  const grouped = new Map<number | "lost", string[]>();

  for (const r of results) {
    const key = r.won ? r.guessCount : "lost";
    const existing = grouped.get(key) || [];
    existing.push(`<@${r.userId}>`);
    grouped.set(key, existing);
  }

  const lines: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const players = grouped.get(i);
    if (players) {
      lines.push(`${NUMBER_EMOJIS[i - 1]}  ${players.join(" ")}`);
    }
  }
  const lost = grouped.get("lost");
  if (lost) {
    lines.push(`💀  ${lost.join(" ")}`);
  }

  return {
    title: `📊 Dingle #${puzzleNumber} — Results`,
    description:
      lines.length > 0 ? lines.join("\n") : "No one played yesterday",
    color: 0xc6a0f6,
  };
}
