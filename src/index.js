const { GraphQLServer } = require('graphql-yoga');
const { Prisma } = require('prisma-binding');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const resolvers = require('./resolvers');

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

// decode either auth header (priority!) or passed token and
// populate the currently active user
server.express.use(async (req, res, next) => {
  const Authorization = req.get('Authorization');
  const cookieToken = req.cookies.token;
  var userId;
  if (Authorization) {
    const token = Authorization.replace('Bearer ', '');
    userId = jwt.verify(token, process.env.APP_SECRET).userId;
  } else if (cookieToken) {
    userId = jwt.verify(cookieToken, process.env.APP_SECRET).userId;
  }
  if (userId) {
    const user = await db.query.user(
      { where: { id: userId } },
      '{ id, permissions, email, name }'
    );
    req.user = user;
  }
  next();
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
