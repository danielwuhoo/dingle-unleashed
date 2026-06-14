FROM node:22-alpine
# Build toolchain for native modules (@discordjs/opus, better-sqlite3) since
# there are no musl prebuilts for these versions — they compile from source.
RUN apk add --no-cache python3 make g++
RUN mkdir -p /opt/app
WORKDIR /opt/app
COPY packages/bot/package.json ./package.json
COPY packages/bot/yarn.lock ./yarn.lock
# Reproducible install: pinned versions, fails if package.json drifts from the lockfile.
RUN yarn install --frozen-lockfile --production
COPY packages/bot/dist/ dist/
RUN mkdir -p /opt/app/data
CMD [ "node", "dist/index.js"]
