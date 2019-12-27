# Indebrau Backend

## Development

1. Prerequisites: Node v13.5.0, Prisma 1.34.10 (`npm install -g prisma`), GraphQL-CLI (`npm install -g graphql-cli`)

2. Rename '.env.sample' to '.env' and adjust values

3. Run
```
npm install
prisma deploy
graphql get-schema --project database
npm run dev
```

## Deployment
Build latest docker image:
```
docker build -t indebrau/indebrau-backend .
```

Then, use docker-compose scripts from main repository. Careful: If you change the datamodel, the container will try a redeploy on first startup. This will fail if exiting data would be corrupted by it. Manual editing may be required in that case.