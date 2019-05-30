const { userQueries } = require('./queries/userQueries');
const { brewingProcessQueries } = require('./queries/brewingProcessQueries');
const { graphQueries } = require('./queries/graphQueries');
const { mediaStreamQueries } = require('./queries/mediaStreamQueries');
const { userMutations } = require('./mutations/userMutations');
const {
  brewingProcessMutations
} = require('./mutations/brewingProcessMutations');
const { graphMutations } = require('./mutations/graphMutations');
const { mediaStreamMutations } = require('./mutations/mediaStreamMutations');

module.exports = {
  Query: {
    ...userQueries,
    ...brewingProcessQueries,
    ...graphQueries,
    ...mediaStreamQueries
  },
  Mutation: {
    ...userMutations,
    ...brewingProcessMutations,
    ...graphMutations,
    ...mediaStreamMutations
  }
};
