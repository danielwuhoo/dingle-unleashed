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
COPY --from=builder /app/node_modules/socket.io ./node_modules/socket.io
COPY --from=builder /app/node_modules/socket.io-adapter ./node_modules/socket.io-adapter
COPY --from=builder /app/node_modules/engine.io ./node_modules/engine.io
COPY --from=builder /app/node_modules/engine.io-parser ./node_modules/engine.io-parser
COPY --from=builder /app/node_modules/base64id ./node_modules/base64id
COPY --from=builder /app/node_modules/cors ./node_modules/cors
COPY --from=builder /app/node_modules/@types/cors ./node_modules/@types/cors
COPY --from=builder /app/node_modules/cookie ./node_modules/cookie
COPY --from=builder /app/node_modules/vary ./node_modules/vary
COPY --from=builder /app/node_modules/negotiator ./node_modules/negotiator
COPY --from=builder /app/node_modules/ws ./node_modules/ws
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "custom-server.js"]
