const { activeGraphCache, addSensorDataToCache } = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');

const graphMutations = {
  async createGraph(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    // Mind, that it is possible to connect this graph to an already
    // ended brewing process. Then, tis graph will not be "active".
    let createdGraph = await ctx.prisma.graph.create({
      data: {
        sensorName: args.sensorName,
        updateFrequency: args.updateFrequency,
        brewingStep: {
          connect: {
            id: parseInt(args.brewingStepId)
          }
        }
      }
    });
    await activeGraphCache(ctx, true);
    return createdGraph;
  },

  async deleteGraph(parent, { graphId }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    await ctx.prisma.graph.delete({ where: { id: parseInt(graphId) } });
    await activeGraphCache(ctx, true);
    return { message: 'Deleted!' };
  },

  async addGraphData(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    // add value to sensor data cache first and fetch graphs from cache
    addSensorDataToCache(
      args.sensorName,
      args.sensorValue,
      args.sensorTimeStamp
    );
    const activeGraphs = await activeGraphCache(ctx);
    let insertedGraphData = [];
    // get active graphs with matching sensor name
    for (let i = 0; i < activeGraphs.length; i++) {
      const activeGraph = activeGraphs[i];
      if (activeGraph.sensorName == args.sensorName) {
        // if found, get latest graph data and compare timestamp to
        // determine if it has to be inserted
        const earliestDate =
          new Date(args.sensorTimeStamp).getTime() -
          activeGraph.updateFrequency * 1000; // last entry must be at least this old
        // see if graph data new than this date can be found
        const oldEnoughLatestGraphData = await ctx.prisma.graphData.findMany(
          {
            where: {
              AND: [{ graph: { id: activeGraph.id } },
              { time: { gt: new Date(earliestDate) } }]
            }
          }
        );
        // if not, insert
        if (oldEnoughLatestGraphData.length == 0) {
          insertedGraphData.push(
            await ctx.prisma.graphData.create({
              data: {
                time: args.sensorTimeStamp,
                value: args.sensorValue,
                graph: {
                  connect: { id: activeGraph.id }
                }
              }
            })
          );
        }
      }
    }
    // check if some graph was found
    if (insertedGraphData.length == 0) {
      throw new Error('Did not add to any graphs with sensor name ' + args.sensorName);
    }
    return insertedGraphData;
  }
};

module.exports = { graphMutations };
