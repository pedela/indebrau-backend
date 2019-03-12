const graphQueries = {
  async activeGraph(parent, { sensorName }, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to do that!');
    }
    const graphs = await ctx.db.query.graphs(
      {
        where: { active: true, sensorName: sensorName }
      },
      info
    );
    if (graphs.length > 1) {
      throw new Error('more than one active graph for this sensor!?...');
    }
    if (graphs.length == 0) {
      throw new Error('no active Graph found for sensor');
    }
    return graphs[0];
  }
};

module.exports = { graphQueries };
