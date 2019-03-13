const { userQueries } = require('./queries/userQueries');
const { graphQueries } = require('./queries/graphQueries');
const {userMutations } = require('./mutations/userMutations');
const { graphMutations } = require('./mutations/graphMutations');
const { graphDataMutations } = require('./mutations/graphDataMutations');
const { brewingProcessMutations } = require('./mutations/brewingProcessMutations');

module.exports = {
  Query: {
    ...userQueries,
    ...graphQueries
  },
  Mutation: {
    ...userMutations,
    ...brewingProcessMutations,
    ...graphMutations,
    ...graphDataMutations
  },
};
