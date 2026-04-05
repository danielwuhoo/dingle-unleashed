# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yarn workspaces monorepo with two apps:
- **`packages/bot`** — Discord bot for audio playback in voice channels (YouTube/Spotify). Built with discord.js v14 and TypeScript.
- **`packages/activity`** — Discord Activity (Embedded App SDK) running as a Next.js web app inside Discord's iframe.

## Commands

```bash
# Root (workspace)
yarn                                     # Install all workspace deps

# Bot
yarn workspace dingle-bot dev            # Run bot locally with hot reload
yarn workspace dingle-bot build          # TypeScript compile to dist/
yarn workspace dingle-bot start          # Run compiled dist/index.js
yarn workspace dingle-bot lint           # ESLint with auto-fix
yarn workspace dingle-bot format         # Prettier formatting

# Activity
yarn workspace dingle-activity dev       # Next.js dev server (HTTPS on :5173)
yarn workspace dingle-activity build     # Next.js production build
yarn workspace dingle-activity start     # Next.js production server
```

No test framework is configured.

## Bot Architecture (`packages/bot`)

### Request Flow

Discord event → Event handler → Command repository lookup → Command class → Operation class

Entry point: `src/index.ts` creates `DingleClient` with dependencies from `src/container.ts`.

### Dependency Wiring

`src/container.ts` instantiates all singletons in dependency order and exports them. Commands and operations import what they need directly from the container module. No DI framework — just plain imports and constructor params.

### Directory Structure

- **`src/clients/`** — DingleClient extends discord.js Client, wires everything together
- **`src/container.ts`** — Creates and exports all singleton instances
- **`src/interactions/`** — Discord command definitions (slash, button, menu). Abstract base classes define the interface; implementations live in subdirectories
- **`src/operations/`** — Business logic, one class per action (play, stop, skip, pause, etc.)
- **`src/repositories/`** — Singleton registries that auto-discover commands/events by reading their directories at init time
- **`src/audio/`** — Audio system: AudioSubscription (manages voice connection + queue per guild), Track/YoutubeTrack, TrackFactory, YoutubeService, SpotifyService
- **`src/events/`** — Discord event handlers (interaction routing, message events, ready)
- **`src/models/`** — DingleConfig (loads env vars)

### Adding a New Slash Command

1. Create a class in `src/interactions/slashCommands/` extending `SlashCommand`
2. Set name/description/options in constructor, implement `run()` to delegate to an operation
3. Import needed dependencies from `../../container` and pass to operations
4. The repository auto-discovers it by reading the directory — no manual registration needed

Button and menu commands follow the same pattern in their respective directories.

### Audio System

TrackFactory routes URLs/queries to the appropriate source (YouTube or Spotify). AudioSubscription manages the voice connection, audio player, and track queue per guild, keyed by guildId in AudioSubscriptionRepository.

## Activity Architecture (`packages/activity`)

Next.js 16 app using the Discord Embedded App SDK. Runs inside Discord's iframe in voice channels.

- **`app/`** — Next.js App Router pages and API routes
- **`lib/`** — Discord SDK setup, React Query hooks, Mantine theme, providers
- **`app/api/token/route.ts`** — OAuth2 token exchange endpoint

Uses Mantine UI with Catppuccin Macchiato theme, React Query for data fetching, and a mock SDK for browser dev.

## Environment Variables

Bot (in `packages/bot/.env`): TOKEN, GOOGLE_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, CLIENT_ID, GUILD_ID, CHANNEL_ID, MESSAGE_ID

Activity (in `packages/activity/.env`): NEXT_PUBLIC_DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET

## Code Style

- 4-space indentation, 120-char line width, single quotes, trailing commas, semicolons
- ESLint: airbnb-typescript-prettier config (bot)
- `tsc` handles compilation directly (no Babel)

## Deployment

GitHub Actions on push to master: two parallel jobs build bot and activity separately → Docker images to Docker Hub → SSH to EC2 and restart containers.
