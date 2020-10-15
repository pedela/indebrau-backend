DROP TABLE IF EXISTS "public"."User",
"public"."BrewingProcess",
"public"."UserToBrewingProcess",
"public"."Graph",
"public"."GraphData",
"public"."MediaStream",
"public"."MediaFile" CASCADE;

DROP TYPE IF EXISTS permission, brewing_step, mime_type CASCADE;

CREATE TYPE permission AS ENUM ('ADMIN', 'USER');

CREATE TYPE brewing_step AS ENUM (
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

CREATE TYPE mime_type AS ENUM ('IMAGE_PNG', 'IMAGE_JPG', 'IMAGE_JPEG');

CREATE TABLE "public"."BrewingProcess" (
  id SERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  active_steps brewing_step ARRAY,
  "start" TIMESTAMP,
  "end" TIMESTAMP
);

CREATE TABLE "public"."User" (
  id SERIAL PRIMARY KEY NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  permissions permission ARRAY NOT NULL
);

CREATE TABLE "public"."UserToBrewingProcess" (
  user_id SERIAL NOT NULL,
  brewing_process_id SERIAL NOT NULL,
  PRIMARY KEY (user_id, brewing_Process_id),
  FOREIGN KEY (user_id) REFERENCES "public"."User"(id) ON UPDATE CASCADE,
  FOREIGN KEY (brewing_process_id) REFERENCES "public"."BrewingProcess"(id) ON UPDATE CASCADE
);

CREATE TABLE "public"."Graph" (
  id SERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(255) NOT NULL,
  sensor_name VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL,
  update_frequency INTEGER NOT NULL,
  brewing_process_id INTEGER REFERENCES "public"."BrewingProcess"(id) ON DELETE CASCADE
);

CREATE TABLE "public"."GraphData" (
  id SERIAL PRIMARY KEY NOT NULL,
  time TIMESTAMP NOT NULL,
  value VARCHAR(255) NOT NULL,
  graph_id INTEGER REFERENCES "public"."Graph"(id) ON DELETE CASCADE
);

CREATE TABLE "public"."MediaStream" (
  id SERIAL PRIMARY KEY NOT NULL,
  media_files_name VARCHAR(255) NOT NULL,
  overwrite BOOLEAN NOT NULL,
  active BOOLEAN NOT NULL,
  update_frequency INTEGER NOT NULL,
  brewing_process_id INTEGER REFERENCES "public"."BrewingProcess"(id) ON DELETE CASCADE
);

CREATE TABLE "public"."MediaFile" (
  id SERIAL PRIMARY KEY NOT NULL,
  time TIMESTAMP NOT NULL,
  public_identifier VARCHAR(255) NOT NULL,
  mime_type mime_type ARRAY NOT NULL,
  media_stream_id INTEGER REFERENCES "public"."MediaStream"(id) ON DELETE CASCADE
);