const { activeGraphCache, addSensorDataToCache } = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');

const graphMutations = {
  async createGraph(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    let createdGraph;
    try {
      // 1. create graph
      createdGraph = await ctx.prisma.graph.create({
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
      // 2. search for previous active graph for this sensor and update if exists
      await ctx.prisma.graph.updateMany({
        where: {
          active: true, sensorName: args.sensorName,
          NOT: { id: createdGraph.id }
        },
        data: { active: false }
      });
    } catch (e) {
      throw new Error('Problems querying database: ' + e);
    }
    // update cache
    try {
      await activeGraphCache(ctx, true);
      return createdGraph;
    } catch (e) {
      throw new Error('Caching error');
    }
  },

  async deleteGraph(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { where: { id: parseInt(args.id) } };
    try {
      await ctx.prisma.graph.delete(where);
    } catch (e) {
      throw new Error('Problems querying database');
    }
    // update cache
    try {
      await activeGraphCache(ctx, true);
    } catch (e) {
      throw new Error('Caching error');
    }
    return { message: 'Deleted!' };
  },

  async addGraphData(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    let activeGraphs;
    // add value to sensor data cache first and fetch graphs from cache
    try {
      addSensorDataToCache(
        args.sensorName,
        args.sensorValue,
        args.sensorTimeStamp
      );
      activeGraphs = await activeGraphCache(ctx);
    }
    catch (e) {
      throw new Error('Caching error');
    }
    // get active graph with matching sensor name
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
        try {
          oldEnoughLatestGraphData = await ctx.prisma.graphData.findMany(
            {
              where: {
                AND: [{ graph: { id: activeGraph.id } },
                { time: { gt: new Date(earliestDate) } }]
              },
              take: 1
            }
          );
        }
        catch (e) {
          throw new Error('Problems querying database');
        }
        break;
      }
    }
    // check if graph was found
    if (activeGraph == null) {
      throw new Error('Did not find active graph for sensor ' + args.sensorName);
    }
    // check if old graph data was found (=> new data too recent)
    if (!oldEnoughLatestGraphData.length == 0) {
      throw new Error('Sensor data too recent, not updating ' + args.sensorName);
    }
    // if all checks passed until here, insert data
    try {
      const data = await ctx.prisma.graphData.create({
        data: {
          time: args.sensorTimeStamp,
          value: args.sensorValue,
          graph: {
            connect: { id: activeGraph.id }
          }
        }
      });
      return data;
    } catch (e) {
      throw new Error('Problems querying database');
    }
  }
};

module.exports = { graphMutations };
