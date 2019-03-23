const { checkUserPermissions, reduceGraphDataEvenly } = require('../../utils');

const graphQueries = {
  async activeGraphs(parent, { sensorNames, dataPoints }, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    var graphs = null;
    if (!sensorNames) {
      graphs = await ctx.db.query.graphs(
        {
          where: { active: true, sensorName_in: sensorNames }
        },
        info
      );
    } else {
      graphs = await ctx.db.query.graphs(
        {
          where: { active: true, sensorName_in: sensorNames }
        },
        info
      );
    }
    if (graphs.length == 0) {
      throw new Error('No active graphs found');
    }
    // reduce returned graph data evenly across time
    graphs.map(graph => {
      graph.graphData = reduceGraphDataEvenly(graph.graphData, dataPoints);
    });
    return graphs;
  },

  async graph(parent, { id }, ctx, info) {
    checkUserPermissions(ctx, ['USER', 'ADMIN']);
    return ctx.db.query.graph({ where: { id: id } }, info);
  }
};

module.exports = { graphQueries };
