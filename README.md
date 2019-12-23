# HowTo Build

## Prerequisites
Docker, Node v13.5.0, Prisma 1.34.10 (npm install -g prisma), GraphQL-CLI (npm install -g graphql-cli)


## Deploy Prisma Server/Database:
From folder "database": docker-compose up -d

From root folder: prisma deploy


## Deploy Backend Service:
Exchange .env file values (local dev/deployment), then:

prisma deploy (only needed if DB has changed)

graphql get-schema --project database

## Run:
npm run dev (development)

npm run start (deployment)
