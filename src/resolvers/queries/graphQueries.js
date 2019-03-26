const { checkUserPermissions, reduceGraphDataEvenly } = require('../../utils');

const graphQueries = {
  async graphs(parent, { sensorNames, dataPoints, active }, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);

    let activeGraphs = null;
    let sensors = null;
    if (active) {
      activeGraphs = { active: active };
    }
    if(sensorNames){
      sensors = { sensorNames: sensorNames };
    }

    const graphs = await ctx.db.query.graphs(
      {
        where: { ...activeGraphs, ...sensors }
      },
      info
    );

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
