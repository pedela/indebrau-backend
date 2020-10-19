# Indebrau Backend

## Development

1. Prerequisites: Node v12.19.0, Postgres 13.0

2. Rename '.env.sample' to '.env' and adjust values

3. Run

```
npm install
npx prisma introspect
npx prisma generate
npm run dev
```

For initial/fresh backend deploy: Please mind, that you have to prepare the database first, by running the schema.sql file on it.
Mind, that this will erase all data!

## Deployment

Build latest docker image:

```
docker build -t indebrau/indebrau-backend .
```

## Misc

Please keep in mind, that if changing the media directory in the environment variables, a docker-compose script (mounting the directory as a volume) has to be adjusted as well.
