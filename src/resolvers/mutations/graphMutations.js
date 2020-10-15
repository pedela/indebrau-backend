const {
  activeGraphCache,
  addSensorDataToCache
} = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');

const graphMutations = {
  async createGraph(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    try {
      // 1. search for previous active graph for this sensor and update if exists
      await ctx.prisma.graph.updateMany({
        where: { active: true, sensor_name: args.sensor_name },
        data: { active: false }
      });
      // 2. create graph
      const createdGraph = await ctx.prisma.graph.create(
        {
          data: {
            name: args.name,
            sensor_name: args.sensor_name,
            update_frequency: args.update_frequency,
            active: true,
            BrewingProcess: {
              connect: {
                id: parseInt(args.brewing_process_id)
              }
            }
          }
        },
        info
      );
      // update cache
      await activeGraphCache(ctx, true);
      return createdGraph;
    } catch (error) {
      return error;
    }
  },

  async deleteGraph(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: args.id };
    const deletedGraphReturn = await ctx.prisma.graph.delete({ where }, info);
    // update cache
    await activeGraphCache(ctx, true);
    if (!deletedGraphReturn) {
      throw new Error('Problem deleting graph with id: ' + args.id);
    }
    return deletedGraphReturn;
  },

  async addGraphData(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    // add value to sensor data cache first
    addSensorDataToCache(
      args.sensor_name,
      args.sensor_value,
      args.sensor_time_stamp
    );
    // fetch from cache
    let activeGraphs = await activeGraphCache(ctx);
    // get active graph with matching sensor name
    // (local comparisons, no additional queries here)
    let activeGraph = null;
    let oldEnoughLatestGraphData = null;
    for (let i = 0; i < activeGraphs.length; i++) {
      let graph = activeGraphs[i];
      if (graph.active && !graph.sensor_name.localeCompare(args.sensor_name)) {
        // first active graph should be the only active graph..
        activeGraph = graph;
        // if found, get latest graph data and compare timestamp to
        // determine if it has to be inserted
        const earliestDate =
          new Date(args.sensor_time_stamp).getTime() -
          activeGraph.update_frequency * 1000; // last entry must be at least this old
        // now fetch the latest entry's timestamp

        oldEnoughLatestGraphData = await ctx.prisma.graphData.findMany(
          {
            where: {
              AND: [
                { Graph: { id: activeGraph.id } },

                {
                  time: { gt: new Date(earliestDate) }
                }
              ]
            },
            take: 1
          },
          '{ id, time }'
        );
        break;
      }
    }
    // check if graph was found
    if (activeGraph == null) {
      throw new Error(
        'Did not find active graph for sensor ' + args.sensor_name
      );
    }
    // check if old graph data was found (=> new data too recent)
    if (
      oldEnoughLatestGraphData != null &&
      !oldEnoughLatestGraphData.length == 0
    ) {
      throw new Error(
        'Sensor data too recent, not updating ' + args.sensor_name
      );
    }

    // if all checks passed until here, insert data
    const data = await ctx.prisma.graphData.create({
      data: {
        time: args.sensor_time_stamp,
        value: args.sensor_value,
        Graph: {
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
