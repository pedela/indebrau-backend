const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { activeMediaStreamsCache } = require('../../utils/caches');

const mediaStreamQueries = {
  async mediaStreams(parent, { active }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    if (active) {
      return activeMediaStreamsCache(ctx);
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
