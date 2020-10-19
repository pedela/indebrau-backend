const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { cachedSensorData } = require('../../utils/caches');

const graphQueries = {
  async graphs(parent, { active }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    let where = {};
    if (active) {
      where = { where: { active: active } };
    }
    const graphs = await ctx.prisma.graph.findMany(where);
    return graphs;
  },

  async graph(parent, { id }, ctx) {
    checkUserPermissions(ctx, ['USER'], undefined, id);
    const graph = await ctx.prisma.graph.findOne({
      where: { id: parseInt(id) }
    });
    return graph;
  },

  async latestSensorData(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    let returnArray = [];
    cachedSensorData().forEach((value, key) =>
      returnArray.push({
        sensorName: key,
        sensorTimeStamp: value.sensorTimeStamp,
        sensorValue: value.sensorValue
      })
    );
    return returnArray;
  }
};

module.exports = { graphQueries };
