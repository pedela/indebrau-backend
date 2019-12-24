# Indebrau Backend

## Prerequisites

## Development

### Additional Prerequisites
Node v13.5.0, Prisma 1.34.10 (`npm install -g prisma`), GraphQL-CLI (`npm install -g graphql-cli`)

### Decide which Database to Use
Local (new) database for development: run docker-compose script in "database"(!) folder: `docker-compose up -d`.
Then, use PRISMA_ENDPOINT="http://localhost:4466/indebrau-database/prod" in .env file.

External database: specify endpoint accordingly in .env file.

### .env File (Put in Main Folder)
```
PRISMA_ENDPOINT="http://localhost:4466/indebrau-database/prod"
PRISMA_SECRET=""
APP_SECRET=""
FRONTEND_URL=""
PORT=""
PRISMA_MANAGEMENT_API_SECRET=""
CLOUDINARY_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

### Run
```
npm install
prisma deploy
graphql get-schema --project database
npm run dev
```

## Deployment
```
docker-compose build
docker-compose up -d
```