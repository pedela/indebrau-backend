const { checkUserPermissions } = require('../../utils');

const graphMutations = {
  async createGraph(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN', 'ADMIN']);

    // 1. search for previous active graph for this sensor and update if exists
    await ctx.db.mutation.updateManyGraphs({
      where: { active: true, sensorName: args.sensorName },
      data: { active: false }
    });
    var updateFrequency = 60; // default to one minute
    if (args.updateFrequency) {
      updateFrequency = args.updateFrequency;
    }
    // 2. create graph
    const createdGraph = await ctx.db.mutation.createGraph({
      data: {
        name: args.name,
        sensorName: args.sensorName,
        updateFrequency: updateFrequency,
        active: true,
        brewingProcess: {
          connect: {
            id: args.brewingProcessId
          }
        }
      }
    });
    if (!createdGraph) {
      throw new Error('problem storing graph');
    }
    return {
      id: createdGraph.id
    };
  }
};

module.exports = { graphMutations };
