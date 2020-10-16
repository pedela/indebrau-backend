const { ApolloServer } = require('apollo-server-express');
const express = require('express');
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
  context: (req) => ({ ...req, prisma })
});

// Note, that the order of appearance of the middleware components matters here!
const app = express();
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
    return res.status(401).end(err.toString());
  }
  if (userId) {
    const user = await prisma.user.findOne({
      where: { id: userId },
      include: {
        UserToBrewingProcess: {
          select: {
            BrewingProcess: {
              select: { id: true, Graph: { select: { id: true } } }
            }
          }
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
app.post('/uploadMedia', uploadFile.single('media_data'), (req, res) => {
  handleMediaUpload(prisma, req)
    .then((identifier) => {
      return res.status(201).end(identifier);
    })
    .catch((error) => {
      console.log(error);
      return res.status(500).end(error.toString());
    });
});

server.applyMiddleware({ app, path: '/' });

app.listen({ port: process.env.PORT }, () =>
  console.log(
    `Server ready at http://localhost:${process.env.PORT}${server.graphqlPath}`
  )
);
