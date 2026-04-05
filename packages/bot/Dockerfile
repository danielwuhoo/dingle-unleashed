FROM node:22-alpine
RUN mkdir -p /opt/app
WORKDIR /opt/app
COPY packages/bot/package.json ./package.json
RUN yarn --production --no-lockfile
COPY packages/bot/dist/ dist/
RUN mkdir -p /opt/app/data
CMD [ "node", "dist/index.js"]
