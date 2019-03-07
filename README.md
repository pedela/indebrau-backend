# HowTo Build

Run localy:  
Deploy Database:  
docker-compose up -d  
prisma deploy  
graphql get-schema --project database

Deploy Prisma Server:  
docker-compose up -d  
prisma deploy
graphql get-schema --project database

Finally: npm run debug

Deploy:  
Exchange .env file values  
PRISMA_MANAGEMENT_API_SECRET can be found in Heroku env-variables config on their webpage
prisma deploy (only needed if DB has changed)
graphql get-schema --project database

...and push current version to heroku
