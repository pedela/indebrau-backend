const { ApolloServer } = require('apollo-server-express');
const express = require('express');
const pino = require('pino');
const expressPino = require('express-pino-logger');
const logger = pino({ level: process.env.LOG_LEVEL, customLevels: { app: 41 } });
const expressLogger = expressPino({ logger });
const { ApolloError } = require('apollo-server-express');

var cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const { uploadFile, handleMediaUpload } = require('./utils/mediaFileHandling');

const prisma = new PrismaClient();

const typeDefs = fs.readFileSync('./src/schema.graphql', 'utf8');
const resolvers = require('./resolvers');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (err) => {
    if (err.extensions.code == 'UNAUTHENTICATED'
      || err.extensions.code == 'FORBIDDEN') {
      // we don't need the stacktrace here
      logger.warn(err.message);
      return err;
    }
    else {
      logger.error(err);
      return err;
    }
  },
  context: (req) => ({ ...req, prisma, logger })
});

// Note, that the order of appearance of the middleware components matters here!
const app = express();
app.use(expressLogger);
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(cookieParser());

// decode either auth header (priority!) or passed token and
// populate the currently active user
app.use(async (req, res, next) => {
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
    res.clearCookie('token');
    return res.status(401).end('unauthorized, please use correct credentials..');
  }
  if (userId) {
    const user = await prisma.user.findOne({
      where: { id: userId },
      include: {
        participatingBrewingProcesses: {
          select: { brewingProcess: { select: { id: true } } }
        }
      }
    });
    req.user = user;
  }
  next();
});

// storage for uploaded images
app.use(bodyParser.json());
app.use('/media', express.static(process.env.MAIN_FILES_DIRECTORY));
// first uploads a file (admin only!) to local folder, then puts it in database
// Be aware: medianame and timestamp HAVE to be first in the body for this to work!
app.post('/uploadMedia', uploadFile.single('mediaData'), (req, res) => {
  handleMediaUpload(prisma, logger, req)
    .then((identifier) => {
      logger.app('media file uploaded');
      return res.status(201).end(identifier);
    })
    .catch((error) => {
      logger.error(error);
      return res.status(500).end(error.toString());
    });
});

// Disable cors here because it's configured on express level
server.applyMiddleware({ app, path: '/', cors: false });

app.listen({ port: process.env.PORT }, () =>
  logger.app(
    `Server ready at http://localhost:${process.env.PORT}${server.graphqlPath}`
  )
);
