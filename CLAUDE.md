# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Discord bot for audio playback in voice channels, supporting YouTube and Spotify sources. Built with discord.js v14 and TypeScript, using tsyringe for dependency injection.

## Commands

```bash
yarn dev              # Run locally with hot reload (ts-node-dev)
yarn build            # Type-check + Babel transpile to dist/
yarn check-types      # TypeScript type checking only
yarn start            # Run compiled dist/index.js
yarn lint             # ESLint with auto-fix
yarn format           # Prettier formatting
```

No test framework is configured.

## Architecture

### Request Flow

Discord event → Event handler → Command repository lookup → Command class → Operation class

Entry point: `src/index.ts` resolves `DingleClient` from the tsyringe DI container, which initializes all repositories and services on `init()`.

### Dependency Injection (tsyringe)

- **`@singleton()`** — Services and repositories (one instance via DI container)
- **`@autoInjectable()`** — Commands and operations (instantiated with `new`, dependencies auto-injected as optional constructor params)
- **`@inject()`** — Explicit injection in DingleClient constructor

Operations use `@autoInjectable()` because they're created with `new` from command classes (e.g., `new PlayOperation(interaction)`), with remaining constructor params auto-resolved by tsyringe.

### Directory Structure

- **`src/clients/`** — DingleClient extends discord.js Client, wires everything together
- **`src/interactions/`** — Discord command definitions (slash, button, menu). Abstract base classes define the interface; implementations live in subdirectories
- **`src/operations/`** — Business logic, one class per action (play, stop, skip, pause, etc.)
- **`src/repositories/`** — Singleton registries that auto-discover commands/events by reading their directories at init time
- **`src/audio/`** — Audio system: AudioSubscription (manages voice connection + queue per guild), Track/YoutubeTrack, TrackFactory, YoutubeService, SpotifyService
- **`src/events/`** — Discord event handlers (interaction routing, message events, ready)
- **`src/models/`** — DingleConfig (loads env vars)

### Adding a New Slash Command

1. Create a class in `src/interactions/slashCommands/` extending `SlashCommand`
2. Use `@autoInjectable()` decorator
3. Set name/description/options in constructor, implement `run()` to delegate to an operation
4. The repository auto-discovers it by reading the directory — no manual registration needed

Button and menu commands follow the same pattern in their respective directories.

### Audio System

TrackFactory routes URLs/queries to the appropriate source (YouTube or Spotify). AudioSubscription manages the voice connection, audio player, and track queue per guild, keyed by guildId in AudioSubscriptionRepository.

## Environment Variables

Required in `.env`: TOKEN, GOOGLE_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, CLIENT_ID, GUILD_ID, CHANNEL_ID, MESSAGE_ID

## Code Style

- 4-space indentation, 120-char line width, single quotes, trailing commas, semicolons
- ESLint: airbnb-typescript-prettier config
- Babel handles transpilation (legacy decorators + decorator metadata enabled)

## Deployment

GitHub Actions on push to master: type-check → build → Docker image to Docker Hub → SSH to EC2 and restart container. Docker Compose includes Watchtower for auto-updates.
