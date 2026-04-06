FROM node:22-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_DISCORD_CLIENT_ID
ENV NEXT_PUBLIC_DISCORD_CLIENT_ID=$NEXT_PUBLIC_DISCORD_CLIENT_ID
COPY packages/activity/ .
RUN yarn --no-lockfile
ENV DOCKER_BUILD=1
RUN yarn build
RUN npx tsc --esModuleInterop --module commonjs --moduleResolution node --target ES2022 --outDir dist-server --skipLibCheck server.ts lib/socket-server.ts lib/wordle-utils.ts lib/db.ts

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/dist-server/server.js ./custom-server.js
COPY --from=builder /app/dist-server/lib ./lib
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /app/data /app/.next/cache && chown -R nextjs:nodejs /app/data /app/.next/cache
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "custom-server.js"]
