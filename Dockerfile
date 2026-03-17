FROM node:22.12.0
RUN mkdir -p /opt/app
WORKDIR /opt/app
COPY package.json yarn.lock ./
RUN yarn
COPY dist/ dist/
RUN mkdir -p /opt/app/data
CMD [ "yarn", "start"]