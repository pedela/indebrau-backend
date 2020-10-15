const { GraphQLServer } = require('graphql-yoga');
const { PrismaClient } = require('@prisma/client');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const express = require('express');
const resolvers = require('./resolvers');
const { uploadFile, handleMediaUpload } = require('./utils/mediaFileHandling');

const prisma = new PrismaClient();

const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
  resolverValidationOptions: {
    requireResolversForResolveType: false
  },
  context: (req) => ({ ...req, prisma })
});

server.express.use(cookieParser());
// storage for uploaded images
server.express.use('/media', express.static(process.env.MAIN_FILES_DIRECTORY));

// decode either auth header (priority!) or passed token and
// populate the currently active user
server.express.use(async (req, res, next) => {
  const Authorization = req.get('Authorization');
  const cookieToken = req.cookies.token;
  let userId;
  try {
    if (Authorization) {
      const token = Authorization.replace('Bearer ', '');
      userId = jwt.verify(token, process.env.APP_SECRET).userId;
    } else if (cookieToken) {
      userId = jwt.verify(cookieToken, process.env.APP_SECRET).userId;
    }
  } catch (err) {
    return res.status(401).end(err.toString());
  }
  if (userId) {
    const user = await prisma.user.findOne(
      { where: { id: userId } },
      '{ id, permissions, email, name, participating_brewing_processes{id, graphs {id}} }'
    );
    req.user = user;
  }
  next();
});

server.express.use(bodyParser.json());

// first uploads a file (admin only!) to local folder, then puts it in database
// Be aware: mediaName and timestamp HAVE to be first in the body for this to work!
server.express.post(
  '/uploadMedia',
  uploadFile.single('media_data'),
  (req, res) => {
    handleMediaUpload(prisma, req)
      .then((identifier) => {
        return res.status(201).end(identifier);
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).end(error.toString());
      });
  }
);

server.start(
  {
    cors: {
      credentials: true,
      origin: process.env.FRONTEND_URL
    }
  },
  (deets) => {
    console.log(`Server is now running on port http://localhost:${deets.port}`);
  }
);
