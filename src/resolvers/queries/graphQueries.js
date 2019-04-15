const { checkUserPermissions, reduceGraphDataEvenly } = require('../../utils');

const graphQueries = {
  async graphs(parent, { dataPoints, active }, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);

    let activeGraphs = null;
    if (active) {
      activeGraphs = { active: active };
    }
    const graphs = await ctx.db.query.graphs(
      {
        where: { ...activeGraphs }
      },
      info
    );

    // reduce returned graph data evenly across time
    graphs.map(graph => {
      graph.graphData = reduceGraphDataEvenly(graph.graphData, dataPoints);
    });
    return graphs;
  },

  async graph(parent, { id, dataPoints }, ctx, info) {
    checkUserPermissions(ctx, ['USER'], undefined, id);
    const graph = await ctx.db.query.graph({ where: { id: id } }, info);
    // reduce returned graph data evenly across time
    graph.graphData = reduceGraphDataEvenly(graph.graphData, dataPoints);
    return graph;
  }
};

module.exports = { graphQueries };
