DROP TABLE IF EXISTS "public"."User",
"public"."BrewingProcess",
"public"."UserToBrewingProcess",
"public"."BrewingStep",
"public"."Graph",
"public"."GraphData",
"public"."MediaStream",
"public"."MediaFile" CASCADE;

DROP TYPE IF EXISTS "Permission", "StepName", "MimeType" CASCADE;

CREATE TYPE "Permission" AS ENUM ('ADMIN', 'USER');

CREATE TYPE "StepName" AS ENUM (
'PREPARING',
'BREWING',
'FERMENTING',
'CONDITIONING',
'BOTTLING');

CREATE TYPE "MimeType" AS ENUM ('IMAGE_PNG', 'IMAGE_JPG', 'IMAGE_JPEG');

CREATE TABLE "public"."BrewingProcess" (
  id SERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  "bottlesAvailable" INTEGER,
  "start" TIMESTAMP,
  "end" TIMESTAMP
);

CREATE TABLE "public"."BrewingStep" (
  id SERIAL PRIMARY KEY NOT NULL,
  "name" "StepName" NOT NULL,
  "start" TIMESTAMP,
  "end" TIMESTAMP,
  "brewingProcessId" INTEGER REFERENCES "public"."BrewingProcess"(id) ON DELETE CASCADE
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
  "sensorName" VARCHAR(255) NOT NULL,
  "updateFrequency" INTEGER NOT NULL,
  "brewingStepId" INTEGER REFERENCES "public"."BrewingStep"(id) ON DELETE SET NULL
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
  "updateFrequency" INTEGER NOT NULL,
  "brewingStepId" INTEGER REFERENCES "public"."BrewingStep"(id) ON DELETE CASCADE
);

CREATE TABLE "public"."MediaFile" (
  id SERIAL PRIMARY KEY NOT NULL,
  time TIMESTAMP NOT NULL,
  "publicIdentifier" VARCHAR(255) NOT NULL,
  "mimeType" "MimeType" ARRAY NOT NULL,
  "mediaStreamId" INTEGER REFERENCES "public"."MediaStream"(id) ON DELETE CASCADE
);