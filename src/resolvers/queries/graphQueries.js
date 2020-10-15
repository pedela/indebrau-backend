const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { reduceGraphDataEvenly } = require('../../utils/reduceGraphDataEvenly');
const { cachedSensorData } = require('../../utils/caches');

const graphQueries = {
  async graphs(parent, { data_points, active }, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);

    let activeGraphs = null;
    if (active) {
      activeGraphs = { active: active };
    }
    const graphs = await ctx.prisma.graph.findMany(
      {
        where: { ...activeGraphs }
      },
      info
    );

    // reduce returned graph data evenly across time
    graphs.map((graph) => {
      graph.graphData = reduceGraphDataEvenly(graph.graphData, data_points);
    });
    return graphs;
  },

  async graph(parent, { id, data_points }, ctx, info) {
    checkUserPermissions(ctx, ['USER'], undefined, id);
    const graph = await ctx.prisma.graph.findOne({ where: { id: id } }, info);
    // reduce returned graph data evenly across time
    graph.graphData = reduceGraphDataEvenly(graph.graphData, data_points);
    return graph;
  },

  async latestSensorData(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    let returnArray = [];
    cachedSensorData().forEach((value, key) =>
      returnArray.push({
        sensor_name: key,
        sensor_time_stamp: value.sensor_time_stamp,
        sensor_value: value.sensor_value
      })
    );
    return returnArray;
  }
};

module.exports = { graphQueries };
