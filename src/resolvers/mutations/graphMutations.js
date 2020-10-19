const { activeGraphCache, addSensorDataToCache } = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');

const graphMutations = {
  async createGraph(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    try {
      // 1. search for previous active graph for this sensor and update if exists
      await ctx.prisma.graph.updateMany({
        where: { active: true, sensorName: args.sensorName },
        data: { active: false }
      });
      // 2. create graph
      const createdGraph = await ctx.prisma.graph.create({
        data: {
          name: args.name,
          sensorName: args.sensorName,
          updateFrequency: args.updateFrequency,
          active: true,
          brewingProcess: {
            connect: {
              id: parseInt(args.brewingProcessId)
            }
          }
        }
      });
      // update cache
      await activeGraphCache(ctx, true);
      return createdGraph;
    } catch (error) {
      return error;
    }
  },

  async deleteGraph(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { where: { id: parseInt(args.id) } };
    const deletedGraph = await ctx.prisma.graph.delete(where);
    // update cache
    await activeGraphCache(ctx, true);
    if (!deletedGraph) {
      throw new Error('Problem deleting graph with id: ' + args.id);
    }
    return { message: 'Deleted!' };
  },

  async addGraphData(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    // add value to sensor data cache first
    addSensorDataToCache(
      args.sensorName,
      args.sensorValue,
      args.sensorTimeStamp
    );
    // fetch from cache
    let activeGraphs = await activeGraphCache(ctx);
    // get active graph with matching sensor name
    // (local comparisons, no additional queries here)
    let activeGraph = null;
    let oldEnoughLatestGraphData = null;
    for (let i = 0; i < activeGraphs.length; i++) {
      let graph = activeGraphs[i];
      if (graph.active && !graph.sensorName.localeCompare(args.sensorName)) {
        // first active graph should be the only active graph..
        activeGraph = graph;
        // if found, get latest graph data and compare timestamp to
        // determine if it has to be inserted
        const earliestDate =
          new Date(args.sensorTimeStamp).getTime() -
          activeGraph.updateFrequency * 1000; // last entry must be at least this old
        // now fetch the latest entry's timestamp
        oldEnoughLatestGraphData = await ctx.prisma.graphData.findMany(
          {
            where: {
              AND: [
                { graph: { id: activeGraph.id } },

                {
                  time: { gt: new Date(earliestDate) }
                }
              ]
            },
            take: 1
          }
        );
        break;
      }
    }
    // check if graph was found
    if (activeGraph == null) {
      throw new Error(
        'Did not find active graph for sensor ' + args.sensorName
      );
    }
    // check if old graph data was found (=> new data too recent)
    if (
      oldEnoughLatestGraphData != null &&
      !oldEnoughLatestGraphData.length == 0
    ) {
      throw new Error(
        'Sensor data too recent, not updating ' + args.sensorName
      );
    }
    // if all checks passed until here, insert data
    const data = await ctx.prisma.graphData.create({
      data: {
        time: args.sensorTimeStamp,
        value: args.sensorValue,
        graph: {
          connect: {
            id: activeGraph.id
          }
        }
      }
    });
    if (!data) {
      throw new Error('Problem storing graph data');
    }
    return data;
  }
};

module.exports = { graphMutations };
