const { userQueries } = require('./queries/userQueries');
const { graphQuery } = require('./queries/graphQuery');
const { Subscription } = require('./Subscription');
const { auth } = require('./mutations/auth');
const { graphMutations } = require('./mutations/graphMutations');
const { AuthPayload } = require('./AuthPayload');

module.exports = {
  Query: {
    ...userQueries,
    ...graphQuery
  },
  Mutation: {
    ...auth,
    ...graphMutations
  },
  Subscription,
  AuthPayload
};
