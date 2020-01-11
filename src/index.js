const { GraphQLServer } = require('graphql-yoga');
const { Prisma } = require('prisma-binding');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const express = require('express');
const resolvers = require('./resolvers');
const { uploadFile, handleMediaUpload } = require('./utils/mediaFileHandling');

const db = new Prisma({
  typeDefs: 'src/generated/prisma.graphql',
  endpoint: process.env.PRISMA_ENDPOINT,
  debug: true,
  secret: process.env.PRISMA_SECRET
});

const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
  resolverValidationOptions: {
    requireResolversForResolveType: false
  },
  context: req => ({ ...req, db })
});

server.express.use(cookieParser());
// storage for uploaded images
server.express.use('/media', express.static('../indebrau-media'));

// decode either auth header (priority!) or passed token and
// populate the currently active user
// FIXME: server crashes if empty header or wrong token is provided!
server.express.use(async (req, res, next) => {
  const Authorization = req.get('Authorization');
  const cookieToken = req.cookies.token;
  let userId;
  if (Authorization) {
    const token = Authorization.replace('Bearer ', '');
    userId = jwt.verify(token, process.env.APP_SECRET).userId;
  } else if (cookieToken) {
    userId = jwt.verify(cookieToken, process.env.APP_SECRET).userId;
  }
  if (userId) {
    const user = await db.query.user(
      { where: { id: userId } },
      '{ id, permissions, email, name, participatingBrewingProcesses{id, graphs {id}} }'
    );
    req.user = user;
  }
  next();
});

server.express.use(bodyParser.json());

// first uploads a file (admin only!) to local folder, then puts it in database
// Be aware: mediaName and timestamp HAVE to be first in the body for this to work!
server.express.post('/uploadMedia', uploadFile.single('mediaData'), (req, res) => {
  handleMediaUpload(db, req.body.mediaStreamName, req.body.mediaTimestamp, req.body.mediaMimeType)
    .then(
      () => {
        return res.status(201).end();
      }
    )
    .catch(
      error => {
        return res.status(500).end(error.toString());
      }
    );
});

server.start(
  {
    cors: {
      credentials: true,
      origin: process.env.FRONTEND_URL
    }
  },
  deets => {
    console.log(`Server is now running on port http://localhost:${deets.port}`);
  }
);
