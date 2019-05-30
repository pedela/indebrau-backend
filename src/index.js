const { GraphQLServer } = require('graphql-yoga');
const { Prisma } = require('prisma-binding');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
var crypto = require('crypto');
const resolvers = require('./resolvers');
const { handleMediaUpload } = require('./utils');

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
      '{ id, permissions, email, name, participatingBrewingProcesses{id, graphs {id}} }'
    );
    req.user = user;
  }
  next();
});

server.express.use(bodyParser.json());

// webhook called by Cloudinary, triggers entry in database
// or removal of image from Cloudinary if "not needed"
server.express.use('/imageUploadedWebhook', (req, res) => {
  // Validate webhook signature:
  // https://cloudinary.com/blog/webhooks_upload_notifications_and_background_image_processing
  let toBeSigned = JSON.stringify(req.body).concat(
    req.get('X-Cld-Timestamp').concat(process.env.CLOUDINARY_API_SECRET)
  );
  let signedPayload = crypto
    .createHash('sha1')
    .update(toBeSigned)
    .digest('hex');
  if (signedPayload != req.get('x-cld-signature')) {
    return res.status(403).end();
  } else {
    // Webhook call verified
    // 1. Extract needed metadata from webhook payload
    let mediaMetaData = {
      cloudinaryId: req.body.public_id,
      createdAt: req.body.created_at
    };
    // 2. Call an util function that will check where the posted meda should live
    // and take further consequences
    // (e.g. delete it if it is not needed, adjust timing of new images etc..)
    handleMediaUpload(db, mediaMetaData);
    return res.status(200).end();
  }
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
