const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { cachedSensorData, activeGraphCache } = require('../../utils/caches');

const graphQueries = {
  async graphs(parent, { active }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    if (active) {
      // update so that it returns a fresh instance, not cached results
      return activeGraphCache(ctx, true);
    }
    return await ctx.prisma.graph.findMany();
  },

  async graph(parent, { id }, ctx) {
    checkUserPermissions(ctx, ['USER'], undefined, id);
    return await ctx.prisma.graph.findOne({ where: { id: parseInt(id) } });
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
