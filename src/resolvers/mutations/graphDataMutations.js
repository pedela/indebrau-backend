const { activeGraphCache, checkUserPermissions } = require('../../utils');

const graphDataMutations = {
  async addGraphData(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    // fetch from cache
    var activeGraphs = await activeGraphCache(ctx);
    // get active graph with matching sensor name
    // (local comparisons, no additional queries here)
    var activeGraph = null;
    var oldEnoughLatestGraphData = null;
    for (var i = 0; i < activeGraphs.length; i++) {
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

        oldEnoughLatestGraphData = await ctx.db.query.graphDatas(
          {
            where: {
              AND: [
                { graph: { id: activeGraph.id } },
                { time_gt: new Date(earliestDate).toJSON() }
              ]
            },
            first: 1
          },
          '{ id, time }'
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
    if (oldEnoughLatestGraphData != null && !oldEnoughLatestGraphData.length == 0) {
      throw new Error(
        'Sensor data too recent, not updating ' + args.sensorName
      );
    }

    // if all checks passed until here, insert data
    const data = await ctx.db.mutation.createGraphData({
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

module.exports = { graphDataMutations };
