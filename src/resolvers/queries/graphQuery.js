const { getUserId } = require('../../utils');

const graphQuery = {
  async activeGraph(parent, args, ctx, info) {
    getUserId(ctx);
    if (typeof args.logFileName !== 'undefined') {
      const graphs = await ctx.db.query.graphs(
        {
          where: { active: true, logFileName: args.logFileName }
        },
        info
      );
      if (graphs.length > 1) {
        throw new Error('more than one active graph for this logfile...');
      }
      return graphs[0];
    }
  }
};

module.exports = { graphQuery };
