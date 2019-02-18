FROM archlinux/base as builder

WORKDIR node_modules_build

RUN pacman -Sy && yes | pacman -S yarn npm grep tar which make python3 python2 gcc tar util-linux file fakeroot bison make patch pkgconf sed automake autoconf
COPY *.json ./
COPY packages packages
RUN echo a
RUN npm install -g n
RUN n 10.15.1
RUN node --version
RUN npm --prefix /node_modules_build/packages/api-tests rebuild

#FROM jessie:10.15-alpine
#FROM node:10.15.1-jessie
#FROM debian:buster
FROM node:10.15.1-alpine
#FROM archlinux/base
#FROM alpine

WORKDIR js-api-clients

#RUN apt-get update && yes | apt-get install apt-utils && yes |  apt-get upgrade &&  yes | apt-get install libstdc++6 build-essential npm yarn
#RUN  pacman -Sy && yes | pacman -S yarn npm cronie
RUN apk add yarn npm 
COPY *.json ./
RUN yarn
RUN yarn add tape
#RUN npm install -g n
#RUN n 10.15.1
#RUN npm --prefix /js-api-clients/packages/api-tests rebuild
# Add crontab file in the cron directory
#ADD crontab /etc/cron.d/test-js-cron
#COPY crontab /etc/crontabs/root

# Give execution rights on the cron job
#RUN chmod 0644 /etc/cron.d/test-js-cron

# Apply cron job
#RUN crontab /etc/cron.d/test-js-cron

#COPY /node_modules_build/packages packages
COPY --from=builder /node_modules_build/packages packages
COPY crontab /etc/crontabs/root
ENTRYPOINT ["crond", "-f", "-d", "8"]
#COPY node_modules node_modules


#RUN apk add python gcc
#RUN cd packages/api-tests && npm rebuild scrypt
#ENTRYPOINT ["crond", "-n"]
#ENTRYPOINT ["yarn", "tape", "packages/api-tests/tests/**.js"]
