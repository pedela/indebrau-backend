const { getActiveBrewingProcesses } = require('../../utils');

const graphDataMutations = {
  async addGraphData(parent, { graphData }, ctx) {
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to do that!');
    }
    // fetch from cache
    var activeBrewingProcesses = await getActiveBrewingProcesses(ctx);
    // get active graph with matching sensor name
    // (local comparisons, no additional queries here)
    var activeGraph;
    for (var i = 0; i < activeBrewingProcesses.length; i++) {
      for (var j = 0; j < activeBrewingProcesses[i].graphs.length; j++) {
        let graph = activeBrewingProcesses[i].graphs[j];
        if (
          graph.active &&
          !graph.sensorName.localeCompare(graphData.sensorName)
        ) {
          // first active graph should be the only active graph..
          activeGraph = graph;
          break;
        }
      }
    }
    // check if graph was found
    if (typeof activeGraph == 'undefined') {
      throw new Error(
        'did not find active graph for sensor ' + graphData.sensorName
      );
    }
    const data = await ctx.db.mutation.createGraphData({
      data: {
        time: graphData.sensorTimeStamp,
        value: graphData.sensorValue,
        graph: {
          connect: {
            id: activeGraph.id
          }
        }
      }
    });
    if (!data) {
      throw new Error('problem storing graph data');
    }
    return data;
  }
};

module.exports = { graphDataMutations };
