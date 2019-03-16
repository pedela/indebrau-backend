const { checkUserPermissions } = require('../../utils');

const graphQueries = {
  async activeGraph(parent, { sensorName }, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN', 'ADMIN']);

    const graphs = await ctx.db.query.graphs(
      {
        where: { active: true, sensorName: sensorName }
      },
      info
    );
    if (graphs.length > 1) {
      throw new Error('More than one active graph for this sensor!?');
    }
    if (graphs.length == 0) {
      throw new Error('No active graph found for sensor...');
    }
    return graphs[0];
  },

  async graph(parent, { id }, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN', 'ADMIN']);
    return ctx.db.query.graph({ where: { id: id } }, info);
  }
};

module.exports = { graphQueries };
