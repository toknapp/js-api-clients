FROM node:8.15.0-alpine

WORKDIR js-api-clients

COPY *.json ./
RUN yarn install
RUN yarn add tape

COPY packages packages

ENTRYPOINT ["yarn", "tape", "packages/api-tests/tests/**.js"]
