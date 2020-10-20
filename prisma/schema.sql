DROP TABLE IF EXISTS "public"."User",
"public"."BrewingProcess",
"public"."UserToBrewingProcess",
"public"."Graph",
"public"."GraphData",
"public"."MediaStream",
"public"."MediaFile" CASCADE;

DROP TYPE IF EXISTS "Permission", "BrewingStep", "MimeType" CASCADE;

CREATE TYPE "Permission" AS ENUM ('ADMIN', 'USER');

CREATE TYPE "BrewingStep" AS ENUM (
'MALT_CRUSHING',
'HEATING_UP',
'MASH_IN',
'MASHING',
'HEATING_SPARGE',
'SPARGING',
'BOILING',
'CHILLING',
'FERMENTING',
'CONDITIONING',
'BOTTLED');

CREATE TYPE "MimeType" AS ENUM ('IMAGE_PNG', 'IMAGE_JPG', 'IMAGE_JPEG');

CREATE TABLE "public"."BrewingProcess" (
  id SERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  "bottlesAvailable" INTEGER,
  "activeSteps" "BrewingStep" ARRAY,
  "start" TIMESTAMP,
  "end" TIMESTAMP
);

CREATE TABLE "public"."User" (
  id SERIAL PRIMARY KEY NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  permissions "Permission" ARRAY NOT NULL
);

CREATE TABLE "public"."UserToBrewingProcess" (
	id SERIAL PRIMARY KEY NOT NULL,
  "userId" INTEGER REFERENCES "public"."User"(id) ON DELETE CASCADE,
  "brewingProcessId" INTEGER REFERENCES "public"."BrewingProcess"(id) ON DELETE CASCADE,
   UNIQUE ("userId", "brewingProcessId")
);

CREATE TABLE "public"."Graph" (
  id SERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(255) NOT NULL,
  "sensorName" VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL,
  "updateFrequency" INTEGER NOT NULL,
  "brewingProcessId" INTEGER REFERENCES "public"."BrewingProcess"(id) ON DELETE CASCADE
);

CREATE TABLE "public"."GraphData" (
  id SERIAL PRIMARY KEY NOT NULL,
  time TIMESTAMP NOT NULL,
  value VARCHAR(255) NOT NULL,
  "graphId" INTEGER REFERENCES "public"."Graph"(id) ON DELETE CASCADE
);

CREATE TABLE "public"."MediaStream" (
  id SERIAL PRIMARY KEY NOT NULL,
  "mediaFilesName" VARCHAR(255) NOT NULL,
  overwrite BOOLEAN NOT NULL,
  active BOOLEAN NOT NULL,
  "updateFrequency" INTEGER NOT NULL,
  "brewingProcessId" INTEGER REFERENCES "public"."BrewingProcess"(id) ON DELETE CASCADE
);

CREATE TABLE "public"."MediaFile" (
  id SERIAL PRIMARY KEY NOT NULL,
  time TIMESTAMP NOT NULL,
  "publicIdentifier" VARCHAR(255) NOT NULL,
  "mimeType" "MimeType" ARRAY NOT NULL,
  "mediaStreamId" INTEGER REFERENCES "public"."MediaStream"(id) ON DELETE CASCADE
);