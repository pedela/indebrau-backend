# Indebrau Backend

## Development

1. Prerequisites: Node v13.5.0, GraphQL-CLI (`npm install -g graphql-cli`)

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

Then, use docker-compose scripts from 'indebrau' repository.
Careful: If you change the datamodel, the container will try a redeploy on first startup.
This will fail if exiting data would be corrupted by it.
Manual editing may be required in that case.
(Either use a "fresh" volume or bash inside the container and wipe database.)

## Misc

Please keep in mind, that if changing the media directory in the environment variables, the docker-compose script (mounting the directory as a volume) has to be adjusted as well.

### Variable naming convention

Everything that can be considered "data" and "API" is snake_case due to some Prisma related restrictions.
"Temporary" or "logical" variables follow camelCase notation.
Objects are PascalCase'd.
