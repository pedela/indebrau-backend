const graphMutations = {
  async createGraph(parent, args, ctx) {
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to do that!');
    }
    // 1. search for previous active graph for this sensor and update if exists
    await ctx.db.mutation.updateManyGraphs({
      where: { active: true, sensorName: args.sensorName },
      data: { active: false }
    });
    // 2. create graph
    const createdGraph = await ctx.db.mutation.createGraph({
      data: {
        name: args.name,
        sensorName: args.sensorName,
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
