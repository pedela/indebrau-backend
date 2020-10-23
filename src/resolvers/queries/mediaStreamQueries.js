const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { activeMediaStreamCache } = require('../../utils/caches');

const mediaStreamQueries = {
  async mediaStreams(parent, { active }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    if (active) {
      // update so that it returns a fresh instance, not cached results
      return activeMediaStreamCache(ctx, true);
    }
    return await ctx.prisma.mediaStream.findMany();
  },

  async mediaStream(parent, { id }, ctx) {
    checkUserPermissions(ctx, ['USER'], undefined, id);
    return await ctx.prisma.mediaStream.findOne(
      { where: { id: parseInt(id) } }
    );
  }
};

module.exports = { mediaStreamQueries };
