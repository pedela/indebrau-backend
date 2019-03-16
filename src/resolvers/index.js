const { userQueries } = require('./queries/userQueries');
const { brewingProcessQueries } = require('./queries/brewingProcessQueries');
const { graphQueries } = require('./queries/graphQueries');
const { userMutations } = require('./mutations/userMutations');
const { brewingProcessMutations } = require('./mutations/brewingProcessMutations');
const { graphMutations } = require('./mutations/graphMutations');
const { graphDataMutations } = require('./mutations/graphDataMutations');

module.exports = {
  Query: {
    ...userQueries,
    ...brewingProcessQueries,
    ...graphQueries
  },
  Mutation: {
    ...userMutations,
    ...brewingProcessMutations,
    ...graphMutations,
    ...graphDataMutations
  }
};
